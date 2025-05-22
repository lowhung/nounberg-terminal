import type { Database } from '../../database/index.js';
import type { Common } from '../../internal/common.js';
import type { ApiBuild } from '../../internal/types.js';
/**
 * Starts the server for the specified build.
 */
export declare function runServer(params: {
    common: Common;
    apiBuild: ApiBuild;
    database: Database;
}): Promise<void>;
//# sourceMappingURL=runServer.d.ts.map