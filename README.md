<p  align="center">
	<img  src="https://i.imgur.com/ANnBTvB.png"  />
</p>
<p  align="center">A light weight and code first API framework with automatic type inference and OpenAPI schema generation.</r>

## :construction: Disclaimer

This is still very much a work in progress and at this time makes no promises about functionality or API stability.

## Features

- Define your Request, Response, URL Parameters, and Query Parameters along with your endpoint.
- Enjoy complete type safety based on your router definitions.
- Automatically validate every request and repsonse against your router definitions.
- Automatically generate a customized OpenAPI schema for your API as YAML or JSON.

## Usage/Examples

    <p  align="center">

<img  src="https://i.imgur.com/ANnBTvB.png"  />

</p>

<p  align="center">A light weight and code first API framework with automatic type inference and OpenAPI schema generation.</r>

## :construction: Disclaimer

This is still very much a work in progress and at this time makes no promises about functionality or API stability. In fact, this is so alpha no npm package has been published.

## Features

- Define your Request, Response, URL Parameters, and Query Parameters along with your endpoint.

- Enjoy complete type safety based on your router definitions.

- Automatically validate every request and repsonse against your router definitions.

- Automatically generate a customized OpenAPI schema for your API as YAML or JSON.

## Usage/Examples

```typescript
import { Service, Controller, Type, generate } from "@tracktile/veritas";

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

// COMING SOON: OR run your service inside a lambda
// exports.handler = MyService.lambda();
```

## Coming Soon

- [ ] Support adding shared types to the OpenAPI specifications `components` section and use `$ref` to reference them from the path schemas section.

- [ ] Improved error messaging on request, response, url params, and query params validation.

- [ ] Support for serving openapi json schema directly from API (/\_schema)

- [ ] Support for binding to port or running in a Lambda

## Authors

- [@jarredkenny](https://www.github.com/jarredkenny)

## Coming Soon

- [ ] Support adding shared types to the OpenAPI specifications `components` section and use `$ref` to reference them from the path schemas section.
- [ ] Improved error messaging on request, response, url params, and query params validation.
- [ ] Support for serving openapi json schema directly from API (/\_schema)
- [ ] Support for binding to port or running in a Lambda

## Authors

- [@jarredkenny](https://www.github.com/jarredkenny)
