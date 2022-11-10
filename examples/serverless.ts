import { Service, Controller, Type } from "../src";
import { serverless } from "../src/serverless";

const myController = new Controller();

myController.addOperation(
  {
    name: "Get API Health",
    method: "get",
    path: "/health",
    res: Type.Object({
      alive: Type.Boolean(),
    }),
  },
  async (ctx, next) => {
    ctx.body = { alive: true };
    ctx.status = 200;
    return next();
  }
);

const app = new Service({
  title: "Lambda Based Service",
  controllers: [myController],
});

exports.handler = serverless(app);
