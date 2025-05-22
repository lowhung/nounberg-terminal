import type { Common } from '../internal/common.js';
import type { Schema, SchemaBuild } from '../internal/types.js';
import type { Drizzle } from '../types/db.js';
import type { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import type { IndexingCache } from "./cache.js";
import { type IndexingStore } from "./index.js";
export declare const createHistoricalIndexingStore: ({ common, schemaBuild: { schema }, indexingCache, db, client, }: {
    common: Common;
    schemaBuild: Pick<SchemaBuild, "schema">;
    indexingCache: IndexingCache;
    db: Drizzle<Schema>;
    client: PoolClient | PGlite;
}) => IndexingStore;
//# sourceMappingURL=historical.d.ts.map