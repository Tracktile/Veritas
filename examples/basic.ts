import { Service, Controller, Type, generate } from "../src";

const users = new Controller({
  prefix: "/users",
  tags: ["Users"],
});

const GetUserParams = Type.Object({
  userId: Type.String({ format: "uuid" }),
});

const GetUserResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  firstName: Type.String(),
  lastName: Type.String(),
  email: Type.String({ format: "email" }),
});

users.addOperation(
  {
    name: "Get User By Id",
    path: "/:userId",
    method: "get",
    params: GetUserParams,
    res: GetUserResponse,
  },
  async (ctx, next) => {
    // Within this handler
    // ctx.params.userId is valid and typed
    // ctx.body must satisfy typeof UserResponse

    // ctx.params has been validated and typed
    const { userId } = ctx.params;

    console.log("userId is", userId);

    // ctx.body has typeof { id: string, firstName: string, lastName: string, email: string}
    // and will be validated before sending the response
    ctx.body = {
      id: "some-uuid", // In this example, this will cause a ResponseValidation error as its not a valid uuid!
      firstName: "Test",
      lastName: "McTester",
      email: "test.mctester@testing.com",
    };

    return next();
  }
);

export const MyService = new Service({
  title: "My Wonderful Service",
  description: "Microservice responsible for handling X in the N platform.",
  tags: ["ServiceA"],
  controllers: [users],
});

// Generate and log Openapi Schema Yaml
console.log(generate(MyService));

// OR start and bind your service to a port
MyService.start(8080);

// OR run your service inside a lambda
exports.handler = MyService.lambda();
