import { BuildError } from '../internal/errors.js';
import type { Schema } from '../internal/types.js';
export declare const buildSchema: ({ schema }: {
    schema: Schema;
}) => {
    statements: import("@/drizzle/kit/index.js").SqlStatements;
};
export declare const safeBuildSchema: ({ schema }: {
    schema: Schema;
}) => {
    readonly statements: import("@/drizzle/kit/index.js").SqlStatements;
    readonly status: "success";
    readonly error?: undefined;
} | {
    readonly status: "error";
    readonly error: BuildError;
};
//# sourceMappingURL=schema.d.ts.map