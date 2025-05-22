import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, } from "drizzle-orm/pg-core";
import { getColumnCasing, sqlToReorgTableName } from "./kit/index.js";
export const getTableNames = (table) => {
    const sql = getTableName(table);
    return {
        reorg: sqlToReorgTableName(sql),
        trigger: sqlToReorgTableName(sql),
        triggerFn: `operation_reorg__${sql}()`,
    };
};
export const getPrimaryKeyColumns = (table) => {
    const primaryKeys = getTableConfig(table).primaryKeys;
    const findJsName = (column) => {
        const name = column.name;
        for (const [js, column] of Object.entries(getTableColumns(table))) {
            if (column.name === name)
                return js;
        }
        throw "unreachable";
    };
    if (primaryKeys.length > 0) {
        return primaryKeys[0].columns.map((column) => ({
            sql: getColumnCasing(column, "snake_case"),
            js: findJsName(column),
        }));
    }
    const pkColumn = Object.values(getTableColumns(table)).find((c) => c.primary);
    return [
        {
            sql: getColumnCasing(pkColumn, "snake_case"),
            js: findJsName(pkColumn),
        },
    ];
};
//# sourceMappingURL=index.js.map