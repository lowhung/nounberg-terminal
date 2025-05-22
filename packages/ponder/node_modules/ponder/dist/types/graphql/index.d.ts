import type { Schema } from '../internal/types.js';
import type { ReadonlyDrizzle } from '../types/db.js';
import DataLoader from "dataloader";
import { type TableRelationalConfig } from "drizzle-orm";
import { GraphQLSchema } from "graphql";
export declare function buildGraphQLSchema({ schema, }: {
    schema: Schema;
}): GraphQLSchema;
export declare function buildDataLoaderCache({ drizzle, }: {
    drizzle: ReadonlyDrizzle<Schema>;
}): ({ table }: {
    table: TableRelationalConfig;
}) => DataLoader<string, any, string>;
//# sourceMappingURL=index.d.ts.map