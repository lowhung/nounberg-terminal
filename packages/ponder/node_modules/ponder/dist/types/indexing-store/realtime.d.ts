import type { Database } from '../database/index.js';
import type { Common } from '../internal/common.js';
import type { SchemaBuild } from '../internal/types.js';
import { type IndexingStore } from "./index.js";
export declare const createRealtimeIndexingStore: ({ common, schemaBuild: { schema }, database, }: {
    common: Common;
    schemaBuild: Pick<SchemaBuild, "schema">;
    database: Database;
}) => IndexingStore;
//# sourceMappingURL=realtime.d.ts.map