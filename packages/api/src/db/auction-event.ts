import {desc, lt, eq, and, gt, sql} from 'drizzle-orm';
import {auctionEvents} from "./schema";
import {db} from "./index";
import {logger} from "../logger";

interface PaginationResult<T> {
    data: T[];
    pagination: {
        nextCursor: bigint | null;
        previousCursor: bigint | null;
    };
}

/**
 * Get auction events with cursor-based pagination
 * 
 * Pagination logic:
 * - No cursor: Returns the newest events (DESC order)
 * - With cursor: Returns events older than the cursor timestamp
 * - To go "back" to newer events: Use a cursor from earlier in your pagination history
 * 
 * The cursor is always the blockTimestamp, and pagination flows from newest to oldest.
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

        const baseConditions = [];
        if (type) baseConditions.push(eq(auctionEvents.type, type));
        if (nounId) baseConditions.push(eq(auctionEvents.nounId, nounId));
        const hasPrevious = cursor ? await checkHasNewer(cursor, baseConditions) : false;

        const startCursor = data.length > 0 ? data[0].blockTimestamp : null;
        const endCursor = data.length > 0 ? data[data.length - 1].blockTimestamp : null;

        return {
            data,
            pagination: {
                nextCursor: hasMore ? endCursor : null,
                previousCursor: hasPrevious ? startCursor : null
            }
        };
    } catch (error) {
        logger.error('Error in cursor pagination:', error);
        throw new Error(`Database error in cursor pagination: ${(error as Error).message}`);
    }
}

async function checkHasNewer(cursor: bigint, baseConditions: any[]): Promise<boolean> {
    const conditions = [...baseConditions, gt(auctionEvents.blockTimestamp, cursor)];
    
    const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const result = await db
        .select({ count: sql`select count(*)` })
        .from(auctionEvents)
        .where(whereCondition)
        .limit(1);
    
    return Number(result[0]?.count) > 0;
}

export async function getEventById(id: string) {
    try {
        const results = await db
            .select()
            .from(auctionEvents)
            .where(eq(auctionEvents.id, id))
            .limit(1);

        return results.length > 0 ? results[0] : null;
    } catch (error) {
        logger.error(`Error fetching auction event ${id}:`, error);
        throw new Error(`Database error when fetching event: ${(error as Error).message}`);
    }
}
