import { RequestListener } from "http";
import { Handler } from "aws-lambda";
import Cors from "@koa/cors";
import Koa, { Context, Next, DefaultState } from "koa";

import serverlessExpress, {
  getCurrentInvoke,
} from "@vendia/serverless-express";
import { Service, ServiceContext } from "../src";

interface ConfigureParams {
  app: RequestListener;
  resolutionMode: string;
}

export const serverless = <T extends ServiceContext>(
  service: Service<T>
): Handler => {
  const constructWrappedKoaApp = (app: Service<T>): Koa<DefaultState, T> => {
    const wrapperApp = new Koa<DefaultState, T>({});
    wrapperApp.proxy = true;

    wrapperApp.use(async (ctx: Context, next: Next) => {
      try {
        const { event } = getCurrentInvoke();
        ctx.path = event.requestContext.path;
        ctx.url = event.requestContext.path;
        await next();
      } catch (err) {
        console.log(err);
        throw err;
      }
    });

    app.use(Cors(service.config.cors));
    app.bind();
    wrapperApp.use(app.router.routes());
    wrapperApp.use(app.router.allowedMethods());

    return wrapperApp;
  };

  return serverlessExpress({
    app: constructWrappedKoaApp(service).callback(),
    resolutionMode: "PROMISE",
  } as unknown as ConfigureParams);
};
