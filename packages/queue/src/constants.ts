export const QUEUE_NAMES = {
    EVENT_ENRICHMENT: 'event-enrichment',
};

export const TIME = {
    SECOND: 1,
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 24 * 60 * 60,
    WEEK: 7 * 24 * 60 * 60,
    MONTH: 30 * 24 * 60 * 60,
    YEAR: 365 * 24 * 60 * 60,
};

export const DEFAULT_TTL = {
    ENS_NAME: 2 * TIME.DAY, // 48 hours - ENS can change (e.g. ownership transfer)
    ETH_PRICE_RECENT: TIME.DAY, // 24 hours - very recent prices might still fluctuate slightly
    ETH_PRICE_OLD: 7 * TIME.DAY, // 7 days - settled prices, probably stable
    ETH_PRICE_HISTORICAL: TIME.MONTH * 3, // 3 months - historical data never changes
};

export const ENS_UNIVERSAL_RESOLVER_BLOCK = 19258213;
