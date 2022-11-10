import { TypeCompiler, ValueError } from "@sinclair/typebox/compiler";
import { Type, TSchema } from "@sinclair/typebox";
import Router from "@koa/router";
import { DefaultState, Middleware, Next } from "koa";

import { Service } from "./service";
import { ServiceContext, OperationContext, Operation } from "./types";

export class BadRequestError extends Error {
  errors: Record<string, unknown>[];

  constructor(message?: string, errors: Record<string, unknown>[] = []) {
    super(message || "Bad Request");
    this.errors = errors;
  }
}

interface ControllerOptions {
  prefix?: string;
  tags?: string[];
  auth?: boolean;
  middleware?: Middleware<DefaultState, ServiceContext>[];
}

export class Controller<TExtend = {}> {
  service?: Service<TExtend>;
  prefix: string;
  tags: string[];
  auth: boolean;
  preMatchedRouteMiddleware: Middleware<DefaultState, ServiceContext>[];
  router: Router<
    DefaultState,
    ServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>,
      TExtend
    >
  >;
  operations: [
    OperationContext<TSchema, TSchema, TSchema, TSchema>,
    (
      ctx: ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >,
      next: Next
    ) => Promise<void>
  ][];
  validatorWarnOnly: boolean;

  constructor({
    prefix = "",
    middleware = [],
    tags = [],
    auth = false,
  }: ControllerOptions = {}) {
    this.router = new Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    >();
    this.preMatchedRouteMiddleware = middleware;
    this.tags = tags;
    this.auth = auth;
    this.prefix = prefix;
    this.operations = [];
    this.validatorWarnOnly = false;
  }

  routes() {
    return this.router.routes();
  }

  allowedMethods() {
    return this.router.allowedMethods();
  }

  getOperations() {
    return this.operations;
  }

  setValidatorWarnOnly(state: boolean) {
    this.validatorWarnOnly = state;
  }

  private createOperation<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(base: Operation<TParams, TQuery, TReq, TRes>) {
    return {
      ...base,
      auth: !!base.auth,
      summary: base.summary ?? base.name,
      description: base.description ?? base.name,
      params: base.params ?? Type.Object({}),
      query: base.query ?? Type.Object({}),
      req: base.req ?? Type.Any(),
      res: base.res ?? Type.Any(),
      middleware: base.middleware ?? [],
      tags: this.tags,
    };
  }

  private validateAgainstContext<
    RouteContext extends OperationContext<TSchema, TSchema, TSchema, TSchema>
  >(
    context: Partial<RouteContext>
  ): Middleware<DefaultState, ServiceContext<RouteContext>> {
    return async (ctx: ServiceContext<RouteContext>, next: Next) => {
      let errors: ValueError[] = [];
      if (context.query) {
        errors = [
          ...errors,
          ...TypeCompiler.Compile(context.query).Errors(ctx.query),
        ];
      }
      if (context.params) {
        errors = [
          ...errors,
          ...TypeCompiler.Compile(context.params).Errors(ctx.params),
        ];
      }
      if (context.req) {
        errors = [
          ...errors,
          ...TypeCompiler.Compile(context.req).Errors(ctx.request.body),
        ];
      }

      if (errors.length > 0) {
        if (!this.validatorWarnOnly) {
          throw new BadRequestError(
            "RequestValidationError",
            errors as unknown as Record<string, unknown>[]
          );
        }
        console.warn("RequestValidationError", errors);
      }

      try {
        await next();
      } catch (err) {
        console.warn(err);
        return;
      }

      if (context.res) {
        errors = [...TypeCompiler.Compile(context.res).Errors(ctx.body)];
      }

      if (errors.length > 0) {
        if (!this.validatorWarnOnly) {
          throw new BadRequestError(
            "ResponseValidationError",
            errors as unknown as Record<string, unknown>[]
          );
        }
        console.warn(
          "ResponseValidationError",
          JSON.stringify(errors, null, "  ")
        );
      }
    };
  }

  register<T extends OperationContext<TSchema, TSchema, TSchema, TSchema>>(
    context: T,
    path: string,
    methods: string[],
    routeMiddleware: Middleware<DefaultState, ServiceContext<T, TExtend>>[],
    options?: Router.LayerOptions
  ): Router.Layer {
    const passedMiddleware = Array.isArray(routeMiddleware)
      ? routeMiddleware
      : [routeMiddleware];
    const finalMiddleware = path.toString().startsWith("(")
      ? routeMiddleware
      : [
          ...passedMiddleware.slice(0, passedMiddleware.length - 1),
          this.validateAgainstContext(context),
          ...(this.preMatchedRouteMiddleware as Middleware<
            DefaultState,
            ServiceContext<T>
          >[]),
          ...passedMiddleware.slice(passedMiddleware.length - 1),
        ];

    return this.router.register(path, methods, finalMiddleware, options);
  }

  bind(
    router: Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    > = this.router
  ) {
    this.operations.forEach(([operation, handler]) => {
      this.register(
        operation,
        operation.path,
        [operation.method],
        [...operation.middleware, handler]
      );
    });
    if (!["", "/"].includes(this.prefix)) {
      router.use(this.prefix, this.routes());
      router.use(this.prefix, this.allowedMethods());
    } else {
      router.use(this.routes());
      router.use(this.allowedMethods());
    }
  }

  addOperation<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    definition: Operation<TParams, TQuery, TReq, TRes>,
    handler: (
      ctx: ServiceContext<
        OperationContext<TParams, TQuery, TReq, TRes>,
        TExtend
      >,
      next: Next
    ) => Promise<void>
  ) {
    const operation = this.createOperation(definition);
    this.operations.push([operation, handler]);
  }
}
