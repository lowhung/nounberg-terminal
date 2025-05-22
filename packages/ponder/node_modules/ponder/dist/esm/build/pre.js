import path from "node:path";
import { BuildError } from '../internal/errors.js';
import parse from "pg-connection-string";
function getDatabaseName(connectionString) {
    try {
        const parsed = parse(connectionString);
        return `${parsed.host}:${parsed.port}/${parsed.database}`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to parse database connection string: ${errorMessage}.`);
    }
}
export function buildPre({ config, options, }) {
    const logs = [];
    // Build database.
    let databaseConfig;
    // Determine PGlite directory, preferring config.database.directory if available
    const pgliteDir = config.database?.kind === "pglite" && config.database.directory
        ? config.database.directory === "memory://"
            ? "memory://"
            : path.resolve(config.database.directory)
        : path.join(options.ponderDir, "pglite");
    const pglitePrintPath = pgliteDir === "memory://"
        ? "memory://"
        : path.relative(options.rootDir, pgliteDir);
    if (config.database?.kind) {
        if (config.database.kind === "postgres") {
            let connectionString = undefined;
            let source = undefined;
            if (config.database.connectionString) {
                connectionString = config.database.connectionString;
                source = "from ponder.config.ts";
            }
            else if (process.env.DATABASE_PRIVATE_URL) {
                connectionString = process.env.DATABASE_PRIVATE_URL;
                source = "from DATABASE_PRIVATE_URL env var";
            }
            else if (process.env.DATABASE_URL) {
                connectionString = process.env.DATABASE_URL;
                source = "from DATABASE_URL env var";
            }
            else {
                throw new Error(`Invalid database configuration: 'kind' is set to 'postgres' but no connection string was provided.`);
            }
            logs.push({
                level: "info",
                msg: `Using Postgres database '${getDatabaseName(connectionString)}' (${source})`,
            });
            const poolConfig = {
                connectionString,
                max: config.database.poolConfig?.max ?? 30,
                ssl: config.database.poolConfig?.ssl ?? false,
            };
            databaseConfig = { kind: "postgres", poolConfig };
        }
        else {
            logs.push({
                level: "info",
                msg: `Using PGlite database in '${pglitePrintPath}' (from ponder.config.ts)`,
            });
            databaseConfig = { kind: "pglite", options: { dataDir: pgliteDir } };
        }
    }
    else {
        let connectionString = undefined;
        let source = undefined;
        if (process.env.DATABASE_PRIVATE_URL) {
            connectionString = process.env.DATABASE_PRIVATE_URL;
            source = "from DATABASE_PRIVATE_URL env var";
        }
        else if (process.env.DATABASE_URL) {
            connectionString = process.env.DATABASE_URL;
            source = "from DATABASE_URL env var";
        }
        // If either of the DATABASE_URL env vars are set, use Postgres.
        if (connectionString !== undefined) {
            logs.push({
                level: "info",
                msg: `Using Postgres database ${getDatabaseName(connectionString)} (${source})`,
            });
            const poolConfig = { connectionString, max: 30 };
            databaseConfig = { kind: "postgres", poolConfig };
        }
        else {
            // Fall back to PGlite.
            logs.push({
                level: "info",
                msg: `Using PGlite database at ${pglitePrintPath} (default)`,
            });
            databaseConfig = { kind: "pglite", options: { dataDir: pgliteDir } };
        }
    }
    return {
        databaseConfig,
        logs,
        ordering: config.ordering ?? "omnichain",
    };
}
export function safeBuildPre({ config, options, }) {
    try {
        const result = buildPre({
            config,
            options,
        });
        return {
            status: "success",
            databaseConfig: result.databaseConfig,
            ordering: result.ordering,
            logs: result.logs,
        };
    }
    catch (_error) {
        const buildError = new BuildError(_error.message);
        buildError.stack = undefined;
        return { status: "error", error: buildError };
    }
}
//# sourceMappingURL=pre.js.map