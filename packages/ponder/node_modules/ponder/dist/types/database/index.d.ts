import type { Common } from '../internal/common.js';
import type { IndexingBuild, NamespaceBuild, PreBuild, Schema, SchemaBuild, Status } from '../internal/types.js';
import type { PonderSyncSchema } from '../sync-store/encoding.js';
import type { Drizzle } from '../types/db.js';
import type { PGlite } from "@electric-sql/pglite";
import { type PgQueryResultHKT, type PgTableWithColumns, type PgTransaction } from "drizzle-orm/pg-core";
import { Kysely } from "kysely";
import type { Pool, PoolClient } from "pg";
export type Database = {
    driver: PostgresDriver | PGliteDriver;
    qb: QueryBuilder;
    retry: <T>(fn: () => Promise<T>) => Promise<T>;
    record: <T>(options: {
        method: string;
        includeTraceLogs?: boolean;
    }, fn: () => Promise<T>) => Promise<T>;
    wrap: <T>(options: {
        method: string;
        includeTraceLogs?: boolean;
    }, fn: () => Promise<T>) => Promise<T>;
    transaction: <T>(fn: (client: PoolClient | PGlite, tx: Drizzle<Schema>) => Promise<T>) => Promise<T>;
    /** Migrate the `ponder_sync` schema. */
    migrateSync(): Promise<void>;
    /** Migrate the user schema. */
    migrate({ buildId }: Pick<IndexingBuild, "buildId">): Promise<void>;
    /** Determine the app checkpoint, possibly reverting unfinalized rows. */
    recoverCheckpoint(): Promise<string>;
    createIndexes(): Promise<void>;
    createTriggers(): Promise<void>;
    removeTriggers(): Promise<void>;
    getStatus: () => Promise<Status | null>;
    setStatus: (status: Status) => Promise<void>;
    revert(args: {
        checkpoint: string;
        tx: PgTransaction<PgQueryResultHKT, Schema>;
    }): Promise<void>;
    finalize(args: {
        checkpoint: string;
        db: Drizzle<Schema>;
    }): Promise<void>;
    complete(args: {
        checkpoint: string;
        db: Drizzle<Schema>;
    }): Promise<void>;
};
export type PonderApp = {
    is_locked: 0 | 1;
    is_dev: 0 | 1;
    heartbeat_at: number;
    build_id: string;
    checkpoint: string;
    table_names: string[];
    version: string;
};
type PGliteDriver = {
    instance: PGlite;
};
type PostgresDriver = {
    internal: Pool;
    user: Pool;
    sync: Pool;
    readonly: Pool;
    listen: PoolClient | undefined;
};
type QueryBuilder = {
    /** For migrating the user schema */
    migrate: Kysely<any>;
    /** Used to interact with the sync-store */
    sync: Kysely<PonderSyncSchema>;
    /** For interacting with the user schema (transform) */
    drizzle: Drizzle<Schema>;
    /** For interacting with the user schema (load) */
    drizzleReadonly: Drizzle<Schema>;
};
export declare const getPonderMeta: (namespace: NamespaceBuild) => PgTableWithColumns<{
    name: "_ponder_meta";
    schema: undefined;
    columns: {
        key: import("drizzle-orm/pg-core").PgColumn<{
            name: "key";
            tableName: "_ponder_meta";
            dataType: "string";
            columnType: "PgText";
            data: "app";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: "app";
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "_ponder_meta";
            dataType: "json";
            columnType: "PgJsonb";
            data: PonderApp;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: PonderApp;
        }>;
    };
    dialect: "pg";
}> | PgTableWithColumns<{
    name: "_ponder_meta";
    schema: string;
    columns: {
        key: import("drizzle-orm/pg-core").PgColumn<{
            name: "key";
            tableName: "_ponder_meta";
            dataType: "string";
            columnType: "PgText";
            data: "app";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: "app";
        }>;
        value: import("drizzle-orm/pg-core").PgColumn<{
            name: "value";
            tableName: "_ponder_meta";
            dataType: "json";
            columnType: "PgJsonb";
            data: PonderApp;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: PonderApp;
        }>;
    };
    dialect: "pg";
}>;
export declare const getPonderStatus: (namespace: NamespaceBuild) => PgTableWithColumns<{
    name: "_ponder_status";
    schema: undefined;
    columns: {
        network_name: import("drizzle-orm/pg-core").PgColumn<{
            name: "network_name";
            tableName: "_ponder_status";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        block_number: import("drizzle-orm/pg-core").PgColumn<{
            name: "block_number";
            tableName: "_ponder_status";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        block_timestamp: import("drizzle-orm/pg-core").PgColumn<{
            name: "block_timestamp";
            tableName: "_ponder_status";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        ready: import("drizzle-orm/pg-core").PgColumn<{
            name: "ready";
            tableName: "_ponder_status";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}> | PgTableWithColumns<{
    name: "_ponder_status";
    schema: string;
    columns: {
        network_name: import("drizzle-orm/pg-core").PgColumn<{
            name: "network_name";
            tableName: "_ponder_status";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        block_number: import("drizzle-orm/pg-core").PgColumn<{
            name: "block_number";
            tableName: "_ponder_status";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        block_timestamp: import("drizzle-orm/pg-core").PgColumn<{
            name: "block_timestamp";
            tableName: "_ponder_status";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        ready: import("drizzle-orm/pg-core").PgColumn<{
            name: "ready";
            tableName: "_ponder_status";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const createDatabase: ({ common, namespace, preBuild, schemaBuild, }: {
    common: Common;
    namespace: NamespaceBuild;
    preBuild: Pick<PreBuild, "databaseConfig">;
    schemaBuild: Omit<SchemaBuild, "graphqlSchema">;
}) => Promise<Database>;
export {};
//# sourceMappingURL=index.d.ts.map