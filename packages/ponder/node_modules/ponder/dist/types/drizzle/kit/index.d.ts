import { type TableConfig } from "drizzle-orm";
import { type PgTableWithColumns } from "drizzle-orm/pg-core";
type CasingType = "snake_case" | "camelCase";
export type SqlStatements = {
    tables: {
        sql: string[];
        json: JsonCreateTableStatement[];
    };
    enums: {
        sql: string[];
        json: JsonCreateEnumStatement[];
    };
    indexes: {
        sql: string[];
        json: JsonPgCreateIndexStatement[];
    };
};
export declare const sqlToReorgTableName: (tableName: string) => string;
export declare const getReorgTable: <config extends TableConfig<import("drizzle-orm").Column<any, object, object>>>(table: PgTableWithColumns<config>) => PgTableWithColumns<{
    name: string;
    schema: string;
    columns: {
        operation_id: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation_id";
            tableName: string;
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        operation: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation";
            tableName: string;
            dataType: "number";
            columnType: "PgInteger";
            data: 0 | 1 | 2;
            driverParam: string | number;
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
            $type: 0 | 1 | 2;
        }>;
        checkpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "checkpoint";
            tableName: string;
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
    };
    dialect: "pg";
}> | PgTableWithColumns<{
    name: string;
    schema: undefined;
    columns: {
        operation_id: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation_id";
            tableName: string;
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        operation: import("drizzle-orm/pg-core").PgColumn<{
            name: "operation";
            tableName: string;
            dataType: "number";
            columnType: "PgInteger";
            data: 0 | 1 | 2;
            driverParam: string | number;
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
            $type: 0 | 1 | 2;
        }>;
        checkpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "checkpoint";
            tableName: string;
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: 75;
        }>;
    };
    dialect: "pg";
}>;
export declare const getSql: (schema: {
    [name: string]: unknown;
}) => SqlStatements;
type Index = any;
type Column = any;
interface JsonCreateTableStatement {
    type: "create_table";
    tableName: string;
    schema: string;
    columns: Column[];
    compositePKs: string[];
    compositePkName?: string;
    uniqueConstraints?: string[];
    checkConstraints?: string[];
}
interface JsonCreateEnumStatement {
    type: "create_type_enum";
    name: string;
    schema: string;
    values: string[];
}
interface JsonPgCreateIndexStatement {
    type: "create_index_pg";
    tableName: string;
    data: Index;
    schema: string;
}
export declare function getColumnCasing(column: {
    keyAsName: boolean;
    name: string | undefined;
}, casing: CasingType | undefined): string;
export {};
//# sourceMappingURL=index.d.ts.map