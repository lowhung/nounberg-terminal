/**
 * Serialize function that handles BigInt.
 *
 * Forked from https://github.com/wevm/wagmi
 *
 * @param value to stringify
 * @returns the stringified output
 */
export function serialize(value) {
    return JSON.stringify(value, (_, v) => typeof v === "bigint" ? { __type: "bigint", value: v.toString() } : v);
}
/**
 * Deserialize function that handles BigInt.
 *
 * Forked from https://github.com/wevm/wagmi
 *
 * @param value to parse
 * @returns the output object
 */
export function deserialize(value) {
    return JSON.parse(value, (_, value_) => value_?.__type === "bigint" ? BigInt(value_.value) : value_);
}
//# sourceMappingURL=serialize.js.map