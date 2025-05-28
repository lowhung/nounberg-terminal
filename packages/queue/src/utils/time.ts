export function roundToHour(timestamp: number | bigint): number {
    return Math.round(Number(timestamp) / 3600) * 3600;
}