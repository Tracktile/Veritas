import Koa, { DefaultState, Middleware } from "koa";
import Cors, { Options as CorsOptions } from "@koa/cors";
import Router from "@koa/router";

import { Controller } from "./controller";

export type Contact = {
  name: string;
  email: string;
  url: string;
};

export type License = {
  name: string;
  url: string;
};

export type Server = {
  description: string;
  url: string;
};

export interface ServiceOptions<TExtend = Record<string, never>> {
  internal?: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  prefix?: string;
  version?: string;
  license?: License;
  contact?: Contact;
  servers?: Server[];
  controllers?: Controller<TExtend>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middlewares?: Middleware<DefaultState, any>[];
  config?: Partial<ServiceConfiguration>;
}

export interface ServiceConfiguration {
  validatorWarnOnly?: boolean;
  cors: CorsOptions;
}

export const DEFAULT_SERVICE_CONFIGURATION: ServiceConfiguration = {
  validatorWarnOnly: false,
  cors: {},
} as const;

export class Service<TExtend = Record<string, unknown>> extends Koa<DefaultState, unknown> {
  version: string;
  title: string;
  description: string;
  tags: string[];
  prefix: string;
  internal: boolean;
  contact: Contact;
  license: License;
  servers: Server[];
  controllers: Controller<TExtend>[];
  children: Service<TExtend>[];
  middleware: Middleware<DefaultState, unknown>[];
  router: Router<DefaultState, TExtend>;
  config: ServiceConfiguration;

  constructor({
    title = "",
    description = "",
    prefix = "",
    version = "",
    servers = [{ description: "", url: "" }],
    contact = { name: "", email: "", url: "" },
    license = { name: "", url: "" },
    tags = [],
    controllers = [],
    middlewares = [],
    internal = false,
    config = DEFAULT_SERVICE_CONFIGURATION,
  }: ServiceOptions<TExtend>) {
    super();
    this.router = new Router<DefaultState, TExtend>();
    this.version = version;
    this.children = [];
    this.title = title;
    this.description = description;
    this.tags = tags;
    this.contact = contact;
    this.license = license;
    this.servers = servers;
    this.prefix = prefix;
    this.internal = internal;
    this.controllers = controllers;
    this.middleware = middlewares as Middleware<DefaultState, unknown>[];
    this.config = { ...DEFAULT_SERVICE_CONFIGURATION, ...config };
  }

  register(controller: Controller<TExtend>) {
    this.controllers.push(controller);
  }

  bind(target: Router<DefaultState, TExtend> = this.router, config: ServiceConfiguration = this.config) {
    const serviceRouter = new Router<DefaultState, unknown>();

    serviceRouter.use(...this.middleware);

    for (const controller of this.controllers) {
      controller.setValidatorWarnOnly(config.validatorWarnOnly ?? false);
      controller.bind(serviceRouter);
    }

    if (!["", "/"].includes(this.prefix)) {
      target.use(this.prefix, serviceRouter.routes());
      target.use(this.prefix, serviceRouter.allowedMethods());
    } else {
      target.use(serviceRouter.routes());
      target.use(serviceRouter.allowedMethods());
    }
  }

  start(port = 8080, addresses: string[] = ["127.0.0.1"]) {
    this.use(Cors(this.config.cors));
    this.bind();
    this.use(this.router.routes());
    this.use(this.router.allowedMethods());
    for (const address of addresses) {
      this.listen(port, address);
    }
  }
}
