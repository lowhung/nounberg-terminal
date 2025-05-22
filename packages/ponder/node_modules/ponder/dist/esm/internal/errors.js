export class BaseError extends Error {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BaseError"
        });
        Object.defineProperty(this, "meta", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.setPrototypeOf(this, BaseError.prototype);
    }
}
export function getBaseError(err) {
    if (err instanceof BaseError)
        return err;
    if (err instanceof Error)
        return new BaseError(err.message);
    if (typeof err?.message === "string")
        return new BaseError(err.message);
    if (typeof err === "string")
        return new BaseError(err);
    return new BaseError("unknown error");
}
export class BuildError extends BaseError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BuildError"
        });
        Object.setPrototypeOf(this, BuildError.prototype);
    }
}
export class NonRetryableError extends BaseError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "NonRetryableError"
        });
        Object.setPrototypeOf(this, NonRetryableError.prototype);
    }
}
// Indexing store errors
export class StoreError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "StoreError"
        });
        Object.setPrototypeOf(this, StoreError.prototype);
    }
}
export class UniqueConstraintError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "UniqueConstraintError"
        });
        Object.setPrototypeOf(this, UniqueConstraintError.prototype);
    }
}
export class NotNullConstraintError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "NotNullConstraintError"
        });
        Object.setPrototypeOf(this, NotNullConstraintError.prototype);
    }
}
export class RecordNotFoundError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "RecordNotFoundError"
        });
        Object.setPrototypeOf(this, RecordNotFoundError.prototype);
    }
}
export class CheckConstraintError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "CheckConstraintError"
        });
        Object.setPrototypeOf(this, CheckConstraintError.prototype);
    }
}
export class InvalidStoreMethodError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "InvalidStoreMethodError"
        });
        Object.setPrototypeOf(this, InvalidStoreMethodError.prototype);
    }
}
export class UndefinedTableError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "UndefinedTableError"
        });
        Object.setPrototypeOf(this, UndefinedTableError.prototype);
    }
}
export class BigIntSerializationError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "BigIntSerializationError"
        });
        Object.setPrototypeOf(this, BigIntSerializationError.prototype);
    }
}
export class FlushError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "FlushError"
        });
        Object.setPrototypeOf(this, FlushError.prototype);
    }
}
export class ShutdownError extends NonRetryableError {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "ShutdownError"
        });
        Object.setPrototypeOf(this, ShutdownError.prototype);
    }
}
//# sourceMappingURL=errors.js.map