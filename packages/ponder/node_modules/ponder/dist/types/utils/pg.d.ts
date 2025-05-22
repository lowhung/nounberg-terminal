import type { Logger } from '../internal/logger.js';
import pg, { type PoolConfig } from "pg";
export declare function createPool(config: PoolConfig, logger: Logger): pg.Pool;
export declare function createReadonlyPool(config: PoolConfig, logger: Logger, namespace: string): pg.Pool;
//# sourceMappingURL=pg.d.ts.map