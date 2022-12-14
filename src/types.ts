import { Middleware, DefaultState, DefaultContext, ParameterizedContext } from "koa";
import { validate as isUUID } from "uuid";
import { Format } from "@sinclair/typebox/format";

import { TSchema, Static } from "@sinclair/typebox";

Format.Set("palindrome", (value) => value === value.split("").reverse().join(""));
Format.Set("email", (value) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value));
Format.Set("uuid", (value) => isUUID(value));

export type OperationContext<
  T extends OperationDefinition<TSchema, TSchema, TSchema, TSchema> = OperationDefinition<
    TSchema,
    TSchema,
    TSchema,
    TSchema
  >,
  TExtend = Record<string, unknown>,
> = ParameterizedContext<DefaultState, DefaultContext, Static<T["res"]>> &
  TExtend & {
    body: Static<T["res"]>;
    query: Static<T["query"]>;
    params: Static<T["params"]>;
    request: ParameterizedContext["request"] & { body: Static<T["req"]> };
  };

export type OperationDefinition<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema,
> = {
  name: string;
  method: "get" | "post" | "put" | "delete";
  summary: string;
  description: string;
  path: string;
  params: TParams;
  auth: boolean;
  query: TQuery;
  req: TReq;
  res: TRes;
  middleware: Middleware<DefaultState, OperationContext>[];
  tags: string[];
};

export type Operation<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema,
> = Partial<OperationDefinition<TParams, TQuery, TReq, TRes>> &
  Pick<OperationDefinition<TParams, TQuery, TReq, TRes>, "name" | "method" | "path">;
