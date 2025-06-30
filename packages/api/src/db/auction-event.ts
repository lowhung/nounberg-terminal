import {and, desc, eq, lt} from 'drizzle-orm';
import {auctionEvents} from "./schema";
import {db} from "./index";
import {logger} from "@/logger";

interface PaginationResult<T> {
    data: T[];
    pagination: {
        nextCursor: bigint | null;
    };
}

/**
 * Get auction events with cursor-based pagination
 *
 * Pagination logic:
 * - No cursor: Returns the newest events (DESC order)
 * - With cursor: Returns events older than the cursor timestamp
 * - To go back to newer events: Use "Back to Live" to refresh without cursor
 *
 * The cursor is always the blockTimestamp, and pagination flows from newest to oldest.
 * This is simple, reliable unidirectional cursor pagination.
 */
export async function getEvents(options: {
    limit?: number;
    cursor?: bigint;
    type?: 'created' | 'bid' | 'settled';
    nounId?: number;
} = {}): Promise<PaginationResult<any>> {
    const {limit = 20, cursor, type, nounId} = options;
    const validLimit = Math.min(Math.max(limit, 1), 100);

    try {
        const conditions = [];
        if (type) conditions.push(eq(auctionEvents.type, type));
        if (nounId) conditions.push(eq(auctionEvents.nounId, nounId));

        if (cursor) {
            conditions.push(lt(auctionEvents.blockTimestamp, cursor));
        }

        const whereCondition = conditions.length > 0
            ? conditions.length === 1 ? conditions[0] : and(...conditions)
            : undefined;

        const results = await db
            .select()
            .from(auctionEvents)
            .where(whereCondition)
            .orderBy(desc(auctionEvents.blockTimestamp), desc(auctionEvents.id))
            .limit(validLimit + 1);

        const hasMore = results.length > validLimit;
        const data = hasMore ? results.slice(0, validLimit) : results;
        const endCursor = data.length > 0 ? data[data.length - 1].blockTimestamp : null;

        return {
            data,
            pagination: {
                nextCursor: hasMore ? endCursor : null
            }
        };
    } catch (error) {
        logger.error({msg: 'Error fetching auction events', error, options});
        throw new Error(`Database error in cursor pagination: ${(error as Error).message}`);
    }
}

export async function getEventById(id: string) {
    try {
        const results = await db
            .select()
            .from(auctionEvents)
            .where(eq(auctionEvents.id, id))
            .limit(1);

        return results.length > 0 ? results[0] : null;
    } catch (error: unknown) {
        logger.error({ msg: 'Error fetching event by ID', id, error });
        throw new Error(`Database error when fetching event: ${(error as Error).message}`);
    }
}
