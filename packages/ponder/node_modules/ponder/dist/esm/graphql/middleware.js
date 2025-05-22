import { graphiQLHtml } from './graphiql.html.js';
import { maxAliasesPlugin } from "@escape.tech/graphql-armor-max-aliases";
import { maxDepthPlugin } from "@escape.tech/graphql-armor-max-depth";
import { maxTokensPlugin } from "@escape.tech/graphql-armor-max-tokens";
import { printSchema } from "graphql";
import { createYoga } from "graphql-yoga";
import { createMiddleware } from "hono/factory";
import { buildDataLoaderCache, buildGraphQLSchema } from "./index.js";
/**
 * Middleware for GraphQL with an interactive web view.
 *
 * - Docs: https://ponder.sh/docs/query/api-functions#register-graphql-middleware
 *
 * @example
 * import { db } from "ponder:api";
 * import schema from "ponder:schema";
 * import { graphql } from '../index.js';
 * import { Hono } from "hono";
 *
 * const app = new Hono();
 *
 * app.use("/graphql", graphql({ db, schema }));
 *
 * export default app;
 *
 */
export const graphql = ({ db, schema }, { maxOperationTokens = 1000, maxOperationDepth = 100, maxOperationAliases = 30, } = {
    // Default limits are from Apollo:
    // https://www.apollographql.com/blog/prevent-graph-misuse-with-operation-size-and-complexity-limit
    maxOperationTokens: 1000,
    maxOperationDepth: 100,
    maxOperationAliases: 30,
}) => {
    const graphqlSchema = buildGraphQLSchema({ schema });
    generateSchema({ graphqlSchema }).catch(() => { });
    const yoga = createYoga({
        graphqlEndpoint: "*",
        schema: graphqlSchema,
        context: () => {
            const getDataLoader = buildDataLoaderCache({ drizzle: db });
            return {
                getDataLoader,
                getStatus: () => globalThis.PONDER_DATABASE.getStatus(),
                drizzle: db,
            };
        },
        maskedErrors: process.env.NODE_ENV === "production",
        logging: false,
        graphiql: false,
        parserAndValidationCache: false,
        plugins: [
            maxTokensPlugin({ n: maxOperationTokens }),
            maxDepthPlugin({ n: maxOperationDepth, ignoreIntrospection: false }),
            maxAliasesPlugin({ n: maxOperationAliases, allowList: [] }),
        ],
    });
    return createMiddleware(async (c) => {
        if (c.req.method === "GET") {
            return c.html(graphiQLHtml(c.req.path));
        }
        const response = await yoga.handle(c.req.raw);
        // TODO: Figure out why Yoga is returning 500 status codes for GraphQL errors.
        // @ts-expect-error
        response.status = 200;
        // @ts-expect-error
        response.statusText = "OK";
        return response;
    });
};
async function generateSchema({ graphqlSchema, }) {
    const fs = await import(/* webpackIgnore: true */ "node:fs");
    const path = await import(/* webpackIgnore: true */ "node:path");
    fs.mkdirSync(path.join(process.cwd(), "generated"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "generated", "schema.graphql"), printSchema(graphqlSchema), "utf-8");
    // common.logger.debug({
    //   service: "codegen",
    //   msg: "Wrote new file at generated/schema.graphql",
    // });
}
//# sourceMappingURL=middleware.js.map