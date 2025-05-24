import {AuctionEventSchema, AuctionEventSchemaRaw} from "./auction-event.schema";
import {logger} from '../logger';

/**
 * Convert snake_case keys to camelCase recursively
 */
function snakeToCamel(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel);
    }

    return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel(obj[key]);
        return result;
    }, {} as Record<string, any>);
}

/**
 * Transform raw database event to API-ready format
 * 1. Convert snake_case to camelCase
 * 2. Apply Zod schema transformations (formatEther, USD formatting, etc.)
 */
export function transformEvent(rawEvent: any) {
    try {
        const camelCaseEvent = snakeToCamel(rawEvent);
        return AuctionEventSchema.parse(camelCaseEvent);
    } catch (error) {
        logger.error(`Error transforming event: ${error.toString()}, Raw Event: ${JSON.stringify(rawEvent)}`);
        return snakeToCamel(rawEvent);
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
        hasMore: boolean;
        nextCursor: string | null;
        previousCursor: string | null;
        totalCount?: number;
        pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string | null;
            endCursor: string | null;
        };
    };
}) {
    return {
        data: transformEvents(response.data),
        pagination: {
            hasMore: response.pagination.hasMore,
            nextCursor: response.pagination.nextCursor,
            previousCursor: response.pagination.previousCursor,
            totalCount: response.pagination.totalCount,
            pageInfo: response.pagination.pageInfo
        },
        meta: {
            paginationType: 'cursor',
            itemCount: response.data.length,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Transform legacy offset-based paginated response (deprecated)
 */
export function transformPaginatedResponse(response: {
    data: any[];
    count: number;
    offset?: number;
    nextCursor?: string | null;
}) {
    return {
        data: transformEvents(response.data),
        count: response.count,
        offset: response.offset,
        nextCursor: response.nextCursor,
        meta: {
            paginationType: 'offset',
            itemCount: response.data.length,
            timestamp: new Date().toISOString(),
            deprecationWarning: 'Offset-based pagination is deprecated. Please migrate to cursor-based pagination.'
        }
    };
}

/**
 * Transform single event response
 */
export function transformSingleEventResponse(rawEvent: any) {
    const transformedEvent = transformEvent(rawEvent);
    return {
        data: transformedEvent,
        meta: {
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Transform error response with consistent format
 */
export function transformErrorResponse(error: {
    code: string;
    message: string;
    details?: any;
}, statusCode: number = 500) {
    return {
        error: {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString(),
            statusCode
        }
    };
}

/**
 * Transform WebSocket message for real-time events
 */
export function transformWebSocketEvent(rawEvent: any, eventType: 'new_event' | 'updated_event' | 'deleted_event' = 'new_event') {
    const transformedEvent = transformEvent(rawEvent);

    return {
        type: eventType,
        data: transformedEvent,
        timestamp: new Date().toISOString(),
        meta: {
            eventId: transformedEvent.id,
            nounId: transformedEvent.nounId,
            blockNumber: transformedEvent.blockNumber
        }
    };
}

/**
 * Validate event without transformations (for type checking)
 */
export function validateEvent(event: any) {
    try {
        return AuctionEventSchemaRaw.parse(snakeToCamel(event));
    } catch (error) {
        logger.error('Event validation failed:', error);
        throw error;
    }
}

/**
 * Transform health check response
 */
export function transformHealthResponse(health: {
    status: string;
    version: string;
    uptime: number;
    database: any;
    websocket: any;
    pagination?: any;
}) {
    return {
        ...health,
        meta: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        }
    };
}
