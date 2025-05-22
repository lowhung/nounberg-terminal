import type { Database } from '../../database/index.js';
import type { Common } from '../../internal/common.js';
import type { IndexingBuild, PreBuild, SchemaBuild } from '../../internal/types.js';
/** Starts the sync and indexing services for the specified build. */
export declare function run({ common, preBuild, schemaBuild, indexingBuild, database, onFatalError, onReloadableError, }: {
    common: Common;
    preBuild: PreBuild;
    schemaBuild: SchemaBuild;
    indexingBuild: IndexingBuild;
    database: Database;
    onFatalError: (error: Error) => void;
    onReloadableError: (error: Error) => void;
}): Promise<void>;
//# sourceMappingURL=run.d.ts.map