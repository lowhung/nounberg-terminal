import type { Common } from '../internal/common.js';
import type { Kysely, Migration, MigrationProvider } from "kysely";
declare class StaticMigrationProvider implements MigrationProvider {
    getMigrations(): Promise<Record<string, Migration>>;
}
export declare const migrationProvider: StaticMigrationProvider;
export declare function moveLegacyTables({ common, db, newSchemaName, }: {
    common: Common;
    db: Kysely<any>;
    newSchemaName: string;
}): Promise<void>;
export {};
//# sourceMappingURL=migrations.d.ts.map