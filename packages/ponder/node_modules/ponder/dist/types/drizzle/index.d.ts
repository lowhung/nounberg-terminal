import { type TableConfig } from "drizzle-orm";
import { type PgTable, type PgTableWithColumns } from "drizzle-orm/pg-core";
export declare const getTableNames: (table: PgTableWithColumns<TableConfig>) => {
    reorg: string;
    trigger: string;
    triggerFn: string;
};
export declare const getPrimaryKeyColumns: (table: PgTable) => {
    sql: string;
    js: string;
}[];
//# sourceMappingURL=index.d.ts.map