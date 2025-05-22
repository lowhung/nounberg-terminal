import type { Prettify } from '../types/utils.js';
import { type LevelWithSilent } from "pino";
export type LogMode = "pretty" | "json";
export type LogLevel = Prettify<LevelWithSilent>;
export type Logger = ReturnType<typeof createLogger>;
type Log = {
    level: 60 | 50 | 40 | 30 | 20 | 10;
    time: number;
    service: string;
    msg: string;
    error?: Error;
};
export declare function createLogger({ level, mode, }: {
    level: LogLevel;
    mode?: LogMode;
}): {
    fatal(options: Omit<Log, "level" | "time">): void;
    error(options: Omit<Log, "level" | "time">): void;
    warn(options: Omit<Log, "level" | "time">): void;
    info(options: Omit<Log, "level" | "time">): void;
    debug(options: Omit<Log, "level" | "time">): void;
    trace(options: Omit<Log, "level" | "time">): void;
    flush: () => Promise<unknown>;
};
export {};
//# sourceMappingURL=logger.d.ts.map