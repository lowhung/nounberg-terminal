import {AuctionEventSchema} from "./auction-event.schema";
import {logger} from '../logger';


/**
 * Transform raw database event to API-ready format
 * 1. Convert snake_case to camelCase
 * 2. Apply Zod schema transformations (formatEther, USD formatting, etc.)
 */
export function transformEvent(rawEvent: any) {
    try {
        return AuctionEventSchema.parse(rawEvent);
    } catch (error) {
        logger.error(`Error transforming event: ${error.toString()}, Raw Event: ${JSON.stringify(rawEvent)}`);
    }
}

/**
 * Transform array of events
 */
export function transformEvents(rawEvents: any[]) {
    return rawEvents.map(transformEvent);
}

/**
 * Transform cursor-based paginated response (primary method)
 */
export function transformCursorPaginatedResponse(response: {
    data: any[];
    pagination: {
        nextCursor: bigint | null;
    };
}) {
    return {
        data: transformEvents(response.data),
        pagination: {
            nextCursor: response.pagination.nextCursor ? response.pagination.nextCursor.toString() : null,
        },
        meta: {
            paginationType: 'cursor',
            itemCount: response.data.length,
            timestamp: new Date().toISOString()
        }
    };
}