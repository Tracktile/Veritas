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
  base: Router<
    DefaultState,
    ServiceContext<
      OperationContext<TSchema, TSchema, TSchema, TSchema>,
      TExtend
    >
  >;

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
    this.base = new Router<
      DefaultState,
      ServiceContext<
        OperationContext<TSchema, TSchema, TSchema, TSchema>,
        TExtend
      >
    >();
    this.title = title;
    this.description = description;
    this.tags = tags;
    this.prefix = prefix;
    this.controllers = controllers;
    this.middleware = middlewares;
    controllers.forEach((controller) => {
      controller.setValidatorWarnOnly(validatorWarnOnly);
      this.register(controller);
    });
    this.use(this.base.routes());
    this.use(this.base.allowedMethods());
  }

  private register(controller: Controller<TExtend>) {
    this.base.use(controller.routes());
    this.base.use(controller.allowedMethods());
    this.controllers.push(controller);
  }

  start(port: number = 8080) {
    this.listen(port);
  }
}
