import type { Common } from '../../internal/common.js';
/** Sets up shutdown handlers for the process. Accepts additional cleanup logic to run. */
export declare const createExit: ({ common, }: {
    common: Pick<Common, "logger" | "telemetry" | "shutdown">;
}) => ({ reason, code }: {
    reason: string;
    code: 0 | 1;
}) => Promise<void>;
//# sourceMappingURL=exit.d.ts.map