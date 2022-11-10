<p  align="center">
  <img  src="https://i.imgur.com/ANnBTvB.png"  />
</p>

<p align="center">
  <img src="https://badgen.net/npm/v/@tracktile/veritas"/>
  <img src="https://badgen.net/bundlephobia/minzip/@tracktile/veritas"/>
</p>

 <p  align="center">Code first API framework with full type inference, validation, OpenAPI schema generation, and serverless integration.</p>

## Features

- :muscle: Based on [Koa](https://github.com/koajs/koa), [Typebox](https://github.com/sinclairzx81/typebox), and [openapi3-ts](https://github.com/metadevpro/openapi3-ts).

- :pencil2: Define your Request, Response, URL Parameters, and Query Parameters alongside with your endpoints.

- :necktie: Automatically infers types of parameter, request, and response body types in your handler.

- :lock: Automatically validates each request and response against defined types and validations.

- :notebook_with_decorative_cover: Automatically generates an OpenAPI schema describing your API as YAML or JSON.

- :battery: Deploy your API as microservice, or a modular monolith to AWS Lambda using our provided CDK construct.

- :runner: Run all of your services in a single process for local development. Deploy as seperate services.

## Installation

```sh
  npm install @tracktile/veritas
  # OR
  yarn add @tracktile/veritas
```

## Usage

### Build an amazing API

```typescript
import { Service, Controller, Type, serverless } from "@tracktile/veritas";

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
    /* ctx.params has been validated and inferred as:
        { userId: string } */
    const { userId } = ctx.params;
    /* ctx.body type has been validated and inferred as:
       { id: string, firstName: string, lastName: string, email: string} */
    ctx.body = getUser(userId);
    return next();
  }
);

/* Service title, description, tags, etc are used to generate openapi schema */
export const MyService = new Service({
  title: "My Wonderful Service",
  description: "Microservice responsible for handling X in the N platform.",
  tags: ["ServiceA"],
  controllers: [users],
});

// Start and bind your service to a port
MyService.start(8080);

// OR run your service inside a lambda
exports.handler = serverless(MyService);
```

### Generate your OpenAPI documentation

```sh
yarn veritas generate --yaml --out=./my-api-schema.yaml
OR
yarn veritas generate --json --out=./my-api-schema.json
```

## Examples

Small example projects can be found in the [examples/](./examples) folder.

- [Basic API](./examples/basic.ts)
- [Custom Context](./examples/extending-context.ts)
- [Serverless / AWS Lambda](./examples/serverless.ts)

## Authors

- [@jarredkenny](https://www.github.com/jarredkenny)
