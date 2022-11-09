import { Service, Controller } from "../src";

type Database = "some-db-interface";

type CustomerContextProperties = {
  hello: string;
  db: Database;
};

const test = new Controller<CustomerContextProperties>();

test.addOperation(
  {
    name: "Testing Customer Context",
    method: "get",
    path: "/",
  },
  async (ctx, next) => {
    console.log(typeof ctx.db);
    console.log(typeof ctx.hello);
    return next();
  }
);

const app = new Service<CustomerContextProperties>({
  title: "MyService",
  controllers: [test],
  validatorWarnOnly: true,
});

app.start();
