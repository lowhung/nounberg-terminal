/**
 * Measures the elapsed wall clock time in milliseconds (ms) between two points.
 * @returns A function returning the elapsed time in milliseconds (ms).
 */
export declare function startClock(): () => number;
/**
 * Converts a process.hrtime() measurement to milliseconds (ms).
 * @returns The timestamp in milliseconds (ms).
 */
export declare function hrTimeToMs(diff: [number, number]): number;
//# sourceMappingURL=timer.d.ts.map