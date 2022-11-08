import "reflect-metadata";
import kebabCase from "kebab-case";
import { TSchema } from "@sinclair/typebox";
import { TypeGuard } from "@sinclair/typebox/guard";
import convert from "@openapi-contrib/json-schema-to-openapi-schema";
import * as oa from "openapi3-ts";

import pkg from "../package.json";

import { OperationContext, TracktileService } from "./controller";

export type Services = { resource: string; service: TracktileService }[];

const formatPath = (path: string) => {
  const converted = path
    .split("/")
    .map((part) => {
      if (part.includes(":")) {
        return `{${part.replace(":", "")}}`;
      }
      return part;
    })
    .join("/");
  return converted.endsWith("/")
    ? converted.slice(0, converted.length - 1)
    : converted;
};

async function main() {
  const spec = oa.OpenApiBuilder.create();
  const operationsByPath: Record<
    string,
    OperationContext<TSchema, TSchema, TSchema, TSchema>[]
  > = {};

  spec
    .addTitle("Tracktile API")
    .addDescription(
      `# Introduction
    This API allows programmatic access to all aspects of the [Tracktile](https://tracktile.io) platform. 
    This API is intended to provide a means to integrate with our platform and hopefully allow you to do incredible things.

    ## Early Access

    The Tracktile API is currently in an early access phase while we work closely with our early access users to ensure we are building the best
    platform possible.

    If you are interested in joining our early access group, please reach out to [hello@tracktile.io](mailto:hello@tracktile.io).

    ## OpenAPI Specification
    This API is documented in **OpenAPI format** with the intent to make using the API as simple as possible. In addition to 
    this documentation you may use our OpenAPI Specification with a [number of tools](https://openapi.tools/).

    The specification is available in both [YAML](https://docs.tracktile.io/tracktile.openapi.yaml) and [JSON](https://docs.tracktile.io/tracktile.openapi.json) formats.

    ## Cross-Origin Resource Sharing
    This API features Cross-Origin Resource Sharing (CORS) implemented in compliance with  [W3C spec](https://www.w3.org/TR/cors/).
    And that allows cross-domain communication from the browser.
    All responses have a wildcard same-origin which makes them completely public and accessible to everyone.

    # Authentication

    Tracktile API offers two forms of authentication:
      - Personal Access Token
      - Username and password

    <SecurityDefinitions />`
    )
    .addVersion(pkg.version)
    .addLicense({
      name: "Private",
      url: "https://tracktile.io/",
    })
    .addContact({
      name: "Tracktile",
      email: "contact@tracktile.io",
      url: "http://tracktile.io",
    })
    .addServer({ url: "https://api.tracktile.io", description: "Production" })
    .addServer({
      url: "https://development-api.tracktile.io",
      description: "Development",
    })
    .addSecurityScheme("JWT", {
      bearerFormat: "JWT",
      type: "http",
      scheme: "bearer",
      description:
        "The JWT received by authenticating to the /auth/login endpoint.",
    })
    .addResponse("400", {
      description: "Bad Request Error",
      content: {
        "application/json": {
          schema: {
            properties: {
              status: { type: "number" },
              message: { type: "string" },
            },
            example: {
              status: 400,
              message:
                "A helpful error message indicating what was invalid about your request",
            },
          },
        },
      },
    })
    .addResponse("401", {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: {
            properties: {
              status: { type: "number" },
              message: { type: "string" },
            },
            example: {
              status: 401,
              message: "You must be authenticated to access this resource.",
            },
          },
        },
      },
    })
    .addResponse("403", {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: {
            properties: {
              status: { type: "number" },
              message: { type: "string" },
            },
            example: {
              status: 403,
              message:
                "Current user does not have permissions to access this resource.",
            },
          },
        },
      },
    })
    .addResponse("500", {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: {
            properties: {
              status: { type: "number" },
              message: { type: "string" },
            },
            example: {
              status: 500,
              message: "Something has gone horribly wrong.",
            },
          },
        },
      },
    });

  Services.forEach(({ service, resource }) => {
    service.controllers.forEach((controller) => {
      const ops = controller.getOperations();

      ops.forEach((op) => {
        const path = `${resource === "/" ? "" : resource}${controller.prefix}${
          op.path
        }`;

        if (!operationsByPath[path]) {
          operationsByPath[path] = [];
        }

        operationsByPath[path].push(op);
      });
    });
  });

  for (const path of Object.keys(operationsByPath)) {
    let pathObj: oa.PathItemObject = {};
    const operations = operationsByPath[path];

    const [first] = operations;

    pathObj.parameters = Object.keys(first.params.properties).map((key) => ({
      name: key,
      in: "path",
      required: first.params.required.includes(key),
      schema: { type: "string", format: first.params.properties[key].format },
      description: first.params.properties[key].description,
      example: first.params.properties[key].example,
      examples: first.params.properties[key].examples,
    }));

    for (const op of operations) {
      if (!TypeGuard.TObject(op.params)) {
        throw new Error(
          `Invalid parameters provided to route, must be Type.Object. ${op.name} ${op.method} ${op.path}`
        );
      }

      if (!TypeGuard.TObject(op.query)) {
        throw new Error(
          `Invalid query provided to route, must be Type.Object. ${op.name} ${op.method} ${op.path}`
        );
      }

      pathObj = {
        ...pathObj,
        [op.method]: {
          operationId: kebabCase(op.name.replace(/\s/g, "")),
          summary: op.summary,
          description: op.description,
          tags: op.tags,
          ...(["post", "put"].includes(op.method)
            ? {
                requestBody: {
                  content: {
                    "application/json": { schema: await convert(op.req) },
                  },
                },
              }
            : {}),
          parameters: Object.keys(op.query.properties).map((prop) => ({
            name: prop,
            in: "query",
            description: op.query.properties[prop].description,
          })),
          security: op.auth ? [{ JWT: [] }] : [],
          responses: {
            200: {
              description: op.res.description ?? "Success",
              content: {
                "application/json": {
                  schema: await convert(op.res),
                },
              },
            },
            400: { $ref: "#/components/responses/400" },
            401: { $ref: "#/components/responses/401" },
            403: { $ref: "#/components/responses/403" },
            500: { $ref: "#/components/responses/500" },
          } as oa.ResponsesObject,
        } as oa.OperationObject,
      };
    }

    spec.addPath(formatPath(path), pathObj);
  }

  console.log(spec.getSpecAsYaml());
}

main();
