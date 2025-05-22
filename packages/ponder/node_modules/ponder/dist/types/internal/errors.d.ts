export declare class BaseError extends Error {
    name: string;
    meta: string[];
    constructor(message?: string | undefined);
}
export declare function getBaseError(err: any): BaseError;
export declare class BuildError extends BaseError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class NonRetryableError extends BaseError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class StoreError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class UniqueConstraintError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class NotNullConstraintError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class RecordNotFoundError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class CheckConstraintError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class InvalidStoreMethodError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class UndefinedTableError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class BigIntSerializationError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class FlushError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
export declare class ShutdownError extends NonRetryableError {
    name: string;
    constructor(message?: string | undefined);
}
//# sourceMappingURL=errors.d.ts.map