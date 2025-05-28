import {formatEther} from "viem";

export function convertWeiToUsd(wei: string | undefined, ethPrice: number | null): number | null {
    return (wei && ethPrice)
        ? parseFloat(formatEther(BigInt(wei))) * ethPrice
        : null;
}


export function formatDisplayName(address?: string, ensName?: string | null): string {
    if (ensName) return ensName;
    if (address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return 'unknown';
}

export function formatUsd(amount: number): string {
    return amount.toLocaleString(undefined, {maximumFractionDigits: 0});
}