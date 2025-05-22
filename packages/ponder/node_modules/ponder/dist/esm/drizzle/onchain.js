import { Table, } from "drizzle-orm";
import { PgEnumColumnBuilder, PgTable, primaryKey as drizzlePrimaryKey, } from "drizzle-orm/pg-core";
import { getPgColumnBuilders, } from "drizzle-orm/pg-core/columns/all";
import { PgBigintBuilder } from "./bigint.js";
import { PgBytesBuilder } from "./bytes.js";
import { PgHexBuilder } from "./hex.js";
import { PgTextBuilder } from "./text.js";
/** @internal */
function getColumnNameAndConfig(a, b) {
    return {
        name: typeof a === "string" && a.length > 0 ? a : "",
        config: typeof a === "object" ? a : b,
    };
}
export function hex(columnName) {
    return new PgHexBuilder(columnName ?? "");
}
export function bigint(columnName) {
    return new PgBigintBuilder(columnName ?? "");
}
export function bytes(columnName) {
    return new PgBytesBuilder(columnName ?? "");
}
export function text(a, b = {}) {
    const { name, config } = getColumnNameAndConfig(a, b);
    return new PgTextBuilder(name, config);
}
export const onchain = Symbol.for("ponder:onchain");
export const primaryKey = ({ name, columns, }) => drizzlePrimaryKey({ name, columns });
/**
 * Create an onchain table.
 *
 * - Docs: https://ponder.sh/docs/api-reference/schema#onchaintable
 *
 * @example
 * import { onchainTable } from "ponder";
 *
 * export const account = onchainTable("account", (p) => ({
 *   address: p.hex().primaryKey(),
 *   balance: p.bigint().notNull(),
 * }));
 *
 * @param name - The table name in the database.
 * @param columns - The table columns.
 * @param extra - Config such as indexes or composite primary keys.
 * @returns The onchain table.
 */
export const onchainTable = (name, columns, extraConfig) => {
    const schema = globalThis?.PONDER_NAMESPACE_BUILD;
    const table = pgTableWithSchema(name, columns, extraConfig, schema);
    // @ts-ignore
    table[onchain] = true;
    // @ts-ignore
    return table;
};
export const isPgEnumSym = Symbol.for("drizzle:isPgEnum");
export const onchainEnum = (enumName, values) => {
    const schema = globalThis?.PONDER_NAMESPACE_BUILD;
    const e = pgEnumWithSchema(enumName, values, schema);
    // @ts-ignore
    e[onchain] = true;
    // @ts-ignore
    return e;
};
/** @see https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/pg-core/table.ts#L51 */
function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
    const rawTable = new PgTable(name, schema, baseName);
    const { bigint: int8, text: _text, ...restColumns } = getPgColumnBuilders();
    const parsedColumns = typeof columns === "function"
        ? columns({ ...restColumns, int8, hex, bigint, bytes, text })
        : columns;
    const builtColumns = Object.fromEntries(Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
        const colBuilder = colBuilderBase;
        // @ts-ignore
        colBuilder.setName(name);
        // @ts-ignore
        const column = colBuilder.build(rawTable);
        // @ts-ignore
        rawTable[Symbol.for("drizzle:PgInlineForeignKeys")].push(
        // @ts-ignore
        ...colBuilder.buildForeignKeys(column, rawTable));
        return [name, column];
    }));
    const builtColumnsForExtraConfig = Object.fromEntries(Object.entries(parsedColumns).map(([name, colBuilderBase]) => {
        const colBuilder = colBuilderBase;
        //@ts-ignore
        colBuilder.setName(name);
        //@ts-ignore
        const column = colBuilder.buildExtraConfigColumn(rawTable);
        return [name, column];
    }));
    const table = Object.assign(rawTable, builtColumns);
    //@ts-ignore
    table[Table.Symbol.Columns] = builtColumns;
    //@ts-ignore
    table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
    if (extraConfig) {
        //@ts-ignore
        table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
    }
    return Object.assign(table, {
        enableRLS: () => {
            // @ts-ignore
            table[PgTable.Symbol.EnableRLS] = true;
            return table;
        },
    });
}
function pgEnumWithSchema(enumName, values, schema) {
    const enumInstance = Object.assign((name) => new PgEnumColumnBuilder(name ?? "", enumInstance), {
        enumName,
        enumValues: values,
        schema,
        [isPgEnumSym]: true,
    });
    return enumInstance;
}
//# sourceMappingURL=onchain.js.map