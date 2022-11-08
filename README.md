<p align="center">
  <img src="https://i.imgur.com/ANnBTvB.png" />
</p>

<p align="center">A light weight and code first API framework with automatic type inference and OpenAPI schema generation.</r>

## Features

- Define your Request, Response, URL Parameters, and Query Parameters along with your endpoint.
- Enjoy complete type safety based on your router definitions.
- Automatically validate every request and repsonse against your router definitions.
- Automatically generate a customized OpenAPI schema for your API as YAML or JSON.

## Usage/Examples

```typescript
import { Service, Controller, Type } from "@tracktile/veritas"

# Create a service, this represents a standalone API.
const service = Service({
	title: 'API Title',
    description: `
    	# Standard OpenAPI supported
        - Embed markdown
        - <CustomComponents/>
        - and more
    `
});

# Create controllers for your service, as many as you want!
const users = new Controller({
	prefix: "/users",
    middleware: [db.tenantConnection, rbac.requireRole('admin')]
})

# Define the controllers routes!
users.addOperation({
	name: "Get All Users",
    method: "get",
    path: "/",
    res: Type.Array(Type.Object({
    	id: Type.String({format: "uuid"}),
      	name: Type.String(),
        email: Type.String({format: "email"})
      }))
}, async (ctx, next) => {
	// ctx.request.body has inffered type of {id: string, name: string, email: string} and has been validated.
})
```

## Coming Soon

- [ ] Support adding shared types to the OpenAPI specifications `components` section and use `$ref` to reference them from the path schemas section.
- [ ] Improved error messaging on request, response, url params, and query params validation.
- [ ] Support for serving openapi json schema directly from API (/\_schema)

## Authors

- [@jarredkenny](https://www.github.com/jarredkenny)
