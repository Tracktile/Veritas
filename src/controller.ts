import { v4 as uuid } from "uuid";
import { TypeCompiler, ValueError } from "@sinclair/typebox/compiler";
import { TypeGuard } from "@sinclair/typebox/guard";
import { Type, TSchema } from "@sinclair/typebox";
import Router from "@koa/router";
import { DefaultState, Middleware, Next } from "koa";

import { Service } from "./service";
import { OperationDefinition, OperationContext, Operation } from "./types";

function compose<TContext extends OperationContext>(middleware: Middleware<DefaultState, TContext>[]) {
  return async (context: TContext, next: Next) => {
    let index = -1;
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;
      let fn = middleware[i];
      if (i === middleware.length) {
        fn = next;
      }
      if (!fn) {
        return Promise.resolve();
      }
      try {
        return await fn(context, dispatch.bind(null, i + 1));
      } catch (err) {
        return Promise.reject(err);
      }
    };
    return dispatch(0);
  };
}

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
  middleware?: Middleware<DefaultState, OperationContext>[];
}

export class Controller<TExtend = Record<string, unknown>> {
  service?: Service<TExtend>;
  prefix: string;
  tags: string[];
  auth: boolean;
  preMatchedRouteMiddleware: Middleware<DefaultState, OperationContext>[];
  router: Router<DefaultState, unknown>;
  operations: [
    OperationDefinition<TSchema, TSchema, TSchema, TSchema>,
    (
      ctx: OperationContext<OperationDefinition<TSchema, TSchema, TSchema, TSchema>, TExtend>,
      next: Next,
    ) => Promise<void>,
  ][];
  validatorWarnOnly: boolean;

  constructor({ prefix = "", middleware = [], tags = [], auth = false }: ControllerOptions = {}) {
    this.router = new Router<DefaultState, unknown>();
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

  private createOperation<TParams extends TSchema, TQuery extends TSchema, TReq extends TSchema, TRes extends TSchema>(
    base: Operation<TParams, TQuery, TReq, TRes>,
  ) {
    return {
      ...base,
      auth: !!base.auth,
      summary: base.name,
      description: base.description ?? "No Description",
      params: base.params ?? Type.Object({}),
      query: base.query ?? Type.Object({}),
      req: base.req ?? Type.Any(),
      res: base.res ?? Type.Any(),
      middleware: base.middleware ?? [],
      tags: this.tags,
    };
  }

  private noAdditionalProperties<T extends TSchema>(schema: T): T {
    if (TypeGuard.TArray(schema)) {
      return { ...schema, items: this.noAdditionalProperties(schema.items) };
    }
    if (TypeGuard.TObject(schema)) {
      return {
        ...schema,
        additionalProperties: false,
        properties: Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [key, this.noAdditionalProperties(value)]),
        ),
      };
    }
    if (TypeGuard.TString(schema)) {
      if (schema.format === "uuid" && typeof schema.default === "undefined") {
        schema.default = uuid();
      } else if (schema.format === "date-time" && typeof schema.default === "undefined") {
        schema.default = new Date().toISOString();
      }
    }
    return schema;
  }

  private validateAgainstContext<RouteContext extends OperationDefinition<TSchema, TSchema, TSchema, TSchema>>(
    context: Partial<RouteContext>,
  ): Middleware<DefaultState, OperationContext<RouteContext, TExtend>> {
    return async (ctx: OperationContext<RouteContext, TExtend>, next: Next) => {
      let errors: ValueError[] = [];
      if (context.query) {
        errors = [...errors, ...TypeCompiler.Compile(context.query).Errors(ctx.query)];
      }
      if (context.params) {
        errors = [...errors, ...TypeCompiler.Compile(context.params).Errors(ctx.params)];
      }
      if (context.req) {
        errors = [...errors, ...TypeCompiler.Compile(context.req).Errors(ctx.request.body)];
      }

      if (errors.length > 0) {
        if (!this.validatorWarnOnly) {
          throw new BadRequestError("RequestValidationError", errors as unknown as Record<string, unknown>[]);
        }
        console.warn("RequestValidationError", errors);
      }

      await next();

      if (context.res) {
        errors = [...TypeCompiler.Compile(context.res).Errors(ctx.body)];
      }

      if (errors.length > 0) {
        if (!this.validatorWarnOnly) {
          throw new BadRequestError("ResponseValidationError", errors as unknown as Record<string, unknown>[]);
        }
        console.warn("ResponseValidationError", JSON.stringify(errors, null, "  "));
      }
    };
  }

  register<T extends OperationDefinition<TSchema, TSchema, TSchema, TSchema>>(
    definition: T,
    path: string,
    methods: string[],
    routeMiddleware: Middleware<DefaultState, OperationContext<T, TExtend>>[],
    options?: Router.LayerOptions,
  ): Router.Layer {
    const passedMiddleware = Array.isArray(routeMiddleware) ? routeMiddleware : [routeMiddleware];
    const finalMiddleware = (
      path.toString().startsWith("(")
        ? routeMiddleware
        : [
            ...passedMiddleware.slice(0, passedMiddleware.length - 1),
            this.validateAgainstContext(definition),
            ...this.preMatchedRouteMiddleware,
            ...passedMiddleware.slice(passedMiddleware.length - 1),
          ]
    ) as Middleware<DefaultState, OperationContext<T, TExtend>>[];

    return this.router.register(path, methods, finalMiddleware as Middleware<DefaultState, unknown>[], options);
  }

  bind(router: Router<DefaultState, unknown> = this.router) {
    this.operations.forEach(([operation, handler]) => {
      this.register(operation, operation.path, [operation.method], [...operation.middleware, handler]);
    });
    if (!["", "/"].includes(this.prefix)) {
      router.use(this.prefix, this.routes());
      router.use(this.prefix, this.allowedMethods());
    } else {
      router.use(this.routes());
      router.use(this.allowedMethods());
    }
  }

  addOperation<TParams extends TSchema, TQuery extends TSchema, TReq extends TSchema, TRes extends TSchema>(
    definition: Operation<TParams, TQuery, TReq, TRes>,
    ...handlers: ((
      ctx: OperationContext<OperationDefinition<TParams, TQuery, TReq, TRes>, TExtend>,
      next: Next,
    ) => Promise<void>)[]
  ) {
    const operation = this.createOperation(definition);
    this.operations.push([
      operation,
      compose<OperationContext<OperationDefinition<TParams, TQuery, TReq, TRes>, TExtend>>(handlers),
    ]);
  }
}
