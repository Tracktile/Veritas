import { RequestListener } from "http";
import { Handler } from "aws-lambda";
import Koa, { Context, Next, DefaultState } from "koa";
import mount from "koa-mount";
import serverlessExpress, {
  getCurrentInvoke,
} from "@vendia/serverless-express";

import { Service } from "./service";

interface ConfigureParams {
  app: RequestListener;
  resolutionMode: string;
}

export const serverless = <T>(service: Service<T>): Handler => {
  const constructWrappedKoaApp = (app: Service<T>): Koa<DefaultState, T> => {
    const wrapperApp = new Koa<DefaultState, T>({});
    wrapperApp.proxy = true;

    wrapperApp.use(async (ctx: Context, next: Next) => {
      try {
        const { event } = getCurrentInvoke();
        console.log(JSON.stringify(event));

        if (event.requestContext && event.requestContext.path) {
          ctx.path = event.requestContext.path;
          ctx.url = event.requestContext.path;
        }

        await next();
      } catch (err) {
        console.log(err);
        throw err;
      }
    });

    wrapperApp.use(mount(app));

    return wrapperApp;
  };

  return serverlessExpress({
    app: constructWrappedKoaApp(service).callback(),
    resolutionMode: "PROMISE",
  } as unknown as ConfigureParams);
};
