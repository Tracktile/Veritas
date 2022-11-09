import {
  Middleware,
  DefaultState,
  DefaultContext,
  ParameterizedContext,
} from "koa";
import { TSchema, Static } from "@sinclair/typebox";

export type ServiceContext<
  T extends OperationContext<
    TSchema,
    TSchema,
    TSchema,
    TSchema
  > = OperationContext<TSchema, TSchema, TSchema, TSchema>
> = ParameterizedContext<DefaultState, DefaultContext, Static<T["res"]>> & {
  body: Static<T["res"]>;
  query: Static<T["query"]>;
  params: Static<T["params"]>;
  request: ParameterizedContext["request"] & { body: Static<T["req"]> };
};

export type OperationContext<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema
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
  middleware: Middleware<DefaultState, ServiceContext>[];
  tags: string[];
};

export type Operation<
  TParams extends TSchema,
  TQuery extends TSchema,
  TReq extends TSchema,
  TRes extends TSchema
> = Partial<OperationContext<TParams, TQuery, TReq, TRes>> &
  Pick<
    OperationContext<TParams, TQuery, TReq, TRes>,
    "name" | "method" | "path"
  >;
