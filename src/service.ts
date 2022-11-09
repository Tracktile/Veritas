import { TSchema } from "@sinclair/typebox";
import Koa, { DefaultState, Middleware } from "koa";
import Router from "@koa/router";

import { ServiceContext, OperationContext } from "./types";
import { Controller } from "./controller";

interface ServiceOptions {
  title?: string;
  description?: string;
  tags?: string[];
  prefix?: string;
  controllers?: Controller[];
  middlewares?: Middleware[];
}

export interface ServiceValidationOptions {}

export class Service extends Koa<DefaultState, ServiceContext> {
  title: string;
  description: string;
  tags: string[];
  prefix: string;
  controllers: Controller[];
  middleware: Middleware<DefaultState, ServiceContext>[];
  base: Router<DefaultState, ServiceContext>;

  constructor({
    title = "",
    description = "",
    prefix = "",
    tags = [],
    controllers = [],
    middlewares = [],
  }: ServiceOptions) {
    super();
    this.base = new Router<
      DefaultState,
      ServiceContext<OperationContext<TSchema, TSchema, TSchema, TSchema>>
    >();
    this.title = title;
    this.description = description;
    this.tags = tags;
    this.prefix = prefix;
    this.controllers = controllers;
    this.middleware = middlewares;
    controllers.forEach(this.register.bind(this));
    this.use(this.base.routes());
    this.use(this.base.allowedMethods());
  }

  private register(controller: Controller) {
    this.base.use(controller.routes());
    this.base.use(controller.allowedMethods());
    this.controllers.push(controller);
  }

  start(port: number = 8080) {
    this.listen(port);
  }
}
