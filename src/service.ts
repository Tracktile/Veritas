import Koa, { DefaultState, Middleware } from "koa";
import Router from "@koa/router";
import { TSchema } from "@sinclair/typebox";

import { Controller } from "./controller";
import { ServiceContext, OperationContext } from "./types";

interface ServiceOptions<TExtend> {
  title?: string;
  description?: string;
  tags?: string[];
  prefix?: string;
  controllers?: Controller<TExtend>[];
  middlewares?: Middleware<
    DefaultState,
    ServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>,
      TExtend
    >
  >[];
  validatorWarnOnly?: boolean;
}

interface ServiceConfiguration {
  validatorWarnOnly?: boolean;
}

const DEFAULT_SERVICE_CONFIGURATION: ServiceConfiguration = {
  validatorWarnOnly: false,
} as const;

export class Service<TExtend = {}> extends Koa<
  DefaultState,
  ServiceContext<OperationContext<TSchema, TSchema, TSchema, TSchema>, TExtend>
> {
  title: string;
  description: string;
  tags: string[];
  prefix: string;
  controllers: Controller<TExtend>[];
  middleware: Middleware<
    DefaultState,
    ServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>,
      TExtend
    >
  >[];
  bound: boolean;
  router: Router<
    DefaultState,
    ServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>,
      TExtend
    >
  >;
  config: ServiceConfiguration;

  constructor({
    title = "",
    description = "",
    prefix = "",
    tags = [],
    controllers = [],
    middlewares = [],
    validatorWarnOnly = false,
  }: ServiceOptions<TExtend>) {
    super();
    this.router = new Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    >();
    this.bound = false;
    this.title = title;
    this.description = description;
    this.tags = tags;
    this.prefix = prefix;
    this.controllers = controllers;
    this.middleware = middlewares;
    this.config = { validatorWarnOnly };
  }

  register(controller: Controller<TExtend>) {
    this.controllers.push(controller);
  }

  bind(
    target: Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    > = this.router,
    config: ServiceConfiguration = this.config
  ) {
    if (this.bound) {
      return;
    }

    this.router.use(...this.middleware);

    for (const controller of this.controllers) {
      controller.setValidatorWarnOnly(config.validatorWarnOnly ?? false);
      controller.bind(this.router);
    }

    if (!["", "/"].includes(this.prefix)) {
      target.use(this.prefix, this.router.routes());
      target.use(this.prefix, this.router.allowedMethods());
    } else {
      target.use(this.router.routes());
      target.use(this.router.allowedMethods());
    }
    this.bound = true;
  }

  start(port: number = 8080, addresses: string[] = ["127.0.0.1"]) {
    this.bind();
    this.use(this.router.routes());
    this.use(this.router.allowedMethods());
    for (const address of addresses) {
      this.listen(port, address);
    }
  }
}

/**
 * Utility method for creating a single Veritas Service out of many independent services.
 * Useful when spinning up many microservices as a monolithic gateway bound to a single port.
 *
 * This method skips the regular bind phase of each service and instead creates an independent
 * Router for each service on which that services middleware and individual controllers are mounted
 * and the appropriate prefix.
 */
export function combineServices<TExtend extends {}>(
  services: Service<TExtend>[],
  config: ServiceConfiguration = DEFAULT_SERVICE_CONFIGURATION
): Service<TExtend> {
  const combinedService = new Service<TExtend>({});

  for (const service of services) {
    const middler = new Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    >();

    service.bind(middler, config);
    combinedService.use(middler.routes());
    combinedService.use(middler.allowedMethods());
  }

  return combinedService;
}
