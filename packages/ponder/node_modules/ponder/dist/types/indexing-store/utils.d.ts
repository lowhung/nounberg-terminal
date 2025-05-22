import { type Column, type SQL, type Table } from "drizzle-orm";
/**
 * Returns true if the column has a "default" value that is used when no value is passed.
 * Handles `.default`, `.$defaultFn()`, `.$onUpdateFn()`.
 */
export declare const hasEmptyValue: (column: Column) => boolean;
/** Returns the "default" value for `column`. */
export declare const getEmptyValue: (column: Column, isUpdate: boolean) => unknown;
export declare const normalizeColumn: (column: Column, value: unknown, isUpdate: boolean) => unknown;
export declare const normalizeRow: (table: Table, row: {
    [key: string]: unknown;
}, isUpdate: boolean) => {
    [key: string]: unknown;
};
export declare const getCacheKey: (table: Table, key: object, cache?: Map<Table, [string, Column][]>) => string;
/** Returns an sql where condition for `table` with `key`. */
export declare const getWhereCondition: (table: Table, key: Object) => SQL<unknown>;
//# sourceMappingURL=utils.d.ts.map