import { TypeCompiler, ValueError } from "@sinclair/typebox/compiler";
import { Type, TSchema, Static } from "@sinclair/typebox";
import Router from "@koa/router";
import Koa, {
  ParameterizedContext,
  DefaultContext,
  DefaultState,
  Middleware,
  Next,
} from "koa";

export class BadRequestError extends Error {
  errors: Record<string, unknown>[];

  constructor(message?: string, errors: Record<string, unknown>[] = []) {
    super(message || "Bad Request");
    this.errors = errors;
  }
}

export type OperationContext<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema
> = {
  name: string;
  method: "get" | "post" | "put" | "delete";
  summary: string;
  description: string;
  path: string;
  params: TParams;
  auth: boolean;
  query: TQuery;
  req: TReq;
  res: TRes;
  middleware: Middleware<DefaultState, TracktileServiceContext>[];
  tags: string[];
};

export type Operation<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema
> = Partial<OperationContext<TParams, TQuery, TRes, TReq>> &
  Pick<
    OperationContext<TParams, TQuery, TReq, TRes>,
    "name" | "method" | "path"
  >;

export type TracktileServiceContext<
  T extends OperationContext<
    TSchema,
    TSchema,
    TSchema,
    TSchema
  > = OperationContext<TSchema, TSchema, TSchema, TSchema>
> = ParameterizedContext<DefaultState, DefaultContext, Static<T["res"]>> & {
  serviceName: string;
  tenantId: string;
  validator: Middleware;
  body: Static<T["res"]>;
  query: Static<T["query"]>;
  params: Static<T["params"]>;
  request: ParameterizedContext["request"] & { body: Static<T["req"]> };
};

interface TracktileControllerOptions {
  prefix?: string;
  tags?: string[];
  auth?: boolean;
  middleware?: Middleware<DefaultState, TracktileServiceContext>[];
}

export class TracktileController {
  prefix: string;
  tags: string[];
  auth: boolean;
  preMatchedRouteMiddleware: Middleware<
    DefaultState,
    TracktileServiceContext
  >[];
  router: Router<
    DefaultState,
    TracktileServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>
    >
  >;
  operations: OperationContext<TSchema, TSchema, TSchema, TSchema>[];

  constructor({
    prefix = "",
    middleware = [],
    tags = [],
    auth = false,
  }: TracktileControllerOptions = {}) {
    this.router = new Router<
      DefaultState,
      TracktileServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>
      >
    >({ prefix });
    this.preMatchedRouteMiddleware = middleware;
    this.tags = tags;
    this.auth = auth;
    this.prefix = prefix;
    this.operations = [];
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
  ): Middleware<DefaultState, TracktileServiceContext<RouteContext>> {
    return async (ctx: TracktileServiceContext<RouteContext>, next: Next) => {
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
        throw new BadRequestError(
          "RequestValidationError",
          errors as unknown as Record<string, unknown>[]
        );
      }

      await next();

      if (context.res) {
        errors = [...TypeCompiler.Compile(context.res).Errors(ctx.body)];
      }

      if (errors.length > 0) {
        throw new BadRequestError(
          "ResponseValidationError",
          errors as unknown as Record<string, unknown>[]
        );
      }
    };
  }

  register<T extends OperationContext<TSchema, TSchema, TSchema, TSchema>>(
    context: T,
    path: string | RegExp,
    methods: string[],
    routeMiddleware: Middleware<DefaultState, TracktileServiceContext<T>>[],
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
            TracktileServiceContext<T>
          >[]),
          ...passedMiddleware.slice(passedMiddleware.length - 1),
        ];
    return this.router.register(path, methods, finalMiddleware, options);
  }

  addOperation<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    definition: Operation<TParams, TQuery, TReq, TRes>,
    handler: (
      ctx: TracktileServiceContext<
        OperationContext<TParams, TQuery, TReq, TRes>
      >,
      next: Next
    ) => void
  ) {
    const operation = this.createOperation(definition);
    this.operations.push(operation);
    this.register(
      operation,
      operation.path,
      [operation.method],
      [...operation.middleware, handler]
    );
  }

  get<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    context: OperationContext<TParams, TQuery, TReq, TRes>,
    path: string,
    ...middleware: Middleware<
      DefaultState,
      TracktileServiceContext<typeof context>
    >[]
  ) {
    return this.register<typeof context>(context, path, ["GET"], middleware);
  }

  post<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    context: OperationContext<TParams, TQuery, TReq, TRes>,
    path: string,
    ...middleware: Middleware<
      DefaultState,
      TracktileServiceContext<typeof context>
    >[]
  ) {
    return this.register(context, path, ["POST"], middleware);
  }

  put<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    context: OperationContext<TParams, TQuery, TReq, TRes>,
    path: string,
    ...middleware: Middleware<
      DefaultState,
      TracktileServiceContext<typeof context>
    >[]
  ) {
    return this.register<typeof context>(context, path, ["PUT"], middleware);
  }

  delete<
    TParams extends TSchema,
    TQuery extends TSchema,
    TReq extends TSchema,
    TRes extends TSchema
  >(
    context: OperationContext<TParams, TQuery, TReq, TRes>,
    path: string,
    ...middleware: Middleware<
      DefaultState,
      TracktileServiceContext<typeof context>
    >[]
  ) {
    return this.register<typeof context>(context, path, ["DELETE"], middleware);
  }
}

interface TracktileServiceOptions {
  name: string;
  apiSpecPath?: string;
  controllers?: TracktileController[];
  middlewares?: Middleware[];
}

export type TracktileService = Koa<
  DefaultState,
  TracktileServiceContext<OperationContext<TSchema, TSchema, TSchema, TSchema>>
> & {
  controllers: TracktileController[];
};

export const TracktileService = ({
  name,
  controllers = [],
  middlewares = [],
}: TracktileServiceOptions): TracktileService => {
  const app: TracktileService = Object.assign(
    new Koa<
      DefaultState,
      TracktileServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>
      >
    >(),
    { controllers: [] }
  );

  app.use(async (ctx: ParameterizedContext, next: Next) => {
    ctx.serviceName = name;
    return next();
  });

  middlewares.forEach((middleware) => app.use(middleware));

  const base = new Router<
    DefaultState,
    TracktileServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>
    >
  >();

  controllers.forEach((controller) => {
    app.controllers.push(controller);
    base.use(controller.routes());
    base.use(controller.allowedMethods());
  });

  app.use(base.routes());
  app.use(base.allowedMethods());

  return app;
};
