import type { Config } from '../config/index.js';
import { BuildError } from '../internal/errors.js';
import type { Options } from '../internal/options.js';
import type { DatabaseConfig } from '../internal/types.js';
export declare function buildPre({ config, options, }: {
    config: Config;
    options: Pick<Options, "rootDir" | "ponderDir">;
}): {
    databaseConfig: DatabaseConfig;
    ordering: NonNullable<Config["ordering"]>;
    logs: {
        level: "warn" | "info" | "debug";
        msg: string;
    }[];
};
export declare function safeBuildPre({ config, options, }: {
    config: Config;
    options: Pick<Options, "rootDir" | "ponderDir">;
}): {
    readonly status: "success";
    readonly databaseConfig: DatabaseConfig;
    readonly ordering: NonNullable<"omnichain" | "multichain" | undefined>;
    readonly logs: {
        level: "warn" | "info" | "debug";
        msg: string;
    }[];
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
    readonly databaseConfig?: undefined;
    readonly ordering?: undefined;
    readonly logs?: undefined;
};
//# sourceMappingURL=pre.d.ts.map