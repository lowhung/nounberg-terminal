import {formatEther} from "viem";
import {formatDisplayName, formatUsd} from "./formatters";

export function generateHeadline({
                                     type,
                                     nounId,
                                     bidder,
                                     winner,
                                     valueWei,
                                     amountWei,
                                     bidderEns,
                                     winnerEns,
                                     valueUsd,
                                     amountUsd,
                                 }: {
    type: string;
    nounId: number;
    bidder?: string;
    winner?: string;
    valueWei?: string;
    amountWei?: string;
    bidderEns?: string | null;
    winnerEns?: string | null;
    valueUsd?: number | null;
    amountUsd?: number | null;
}): string {
    switch (type) {
        case 'bid':
            return generateBidHeadline(nounId, bidder, bidderEns, valueWei, valueUsd);

        case 'settled':
            return generateSettledHeadline(nounId, winner, winnerEns, amountWei, amountUsd);

        case 'created':
            return `Auction started for Noun #${nounId}`;

        default:
            return `Event for Noun #${nounId}`;
    }
}

export function generateBidHeadline(
    nounId: number,
    bidder?: string,
    bidderEns?: string | null,
    valueWei?: string,
    valueUsd?: number | null
): string {
    if (!valueWei) return `Bid placed on Noun #${nounId}`;

    const ethValue = formatEther(BigInt(valueWei));
    const displayName = formatDisplayName(bidder, bidderEns);
    const usdPart = valueUsd ? ` ($${formatUsd(valueUsd)})` : '';

    return `Bid placed on Noun #${nounId} for ${ethValue} Ξ${usdPart} by ${displayName}`;
}

export function generateSettledHeadline(
    nounId: number,
    winner?: string,
    winnerEns?: string | null,
    amountWei?: string,
    amountUsd?: number | null
): string {
    if (!amountWei) return `Noun #${nounId} sold`;

    const ethAmount = formatEther(BigInt(amountWei));
    const displayName = formatDisplayName(winner, winnerEns);
    const usdPart = amountUsd ? ` ($${formatUsd(amountUsd)})` : '';

    return `Noun #${nounId} sold for ${ethAmount} Ξ${usdPart} to ${displayName}`;
}
