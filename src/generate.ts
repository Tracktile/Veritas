import "reflect-metadata";
import kebabCase from "kebab-case";
import { TSchema } from "@sinclair/typebox";
import { TypeGuard } from "@sinclair/typebox/guard";
import convert from "@openapi-contrib/json-schema-to-openapi-schema";
import * as oa from "openapi3-ts";

import { OperationContext } from "./types";
import { Service } from "./service";

export type Services = { resource: string; service: Service }[];

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

export async function generate(service: Service) {
  const spec = oa.OpenApiBuilder.create();
  const operationsByPath: Record<
    string,
    OperationContext<TSchema, TSchema, TSchema, TSchema>[]
  > = {};

  service.controllers.forEach((controller) => {
    const ops = controller.getOperations();

    const resource = "/"; // TODO: fix nested service path mapping

    ops.forEach(([op]) => {
      const path = `${resource === "/" ? "" : resource}${controller.prefix}${
        op.path
      }`;

      if (!operationsByPath[path]) {
        operationsByPath[path] = [];
      }

      operationsByPath[path].push(op);
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

  return spec.getSpecAsYaml();
}
