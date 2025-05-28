import {Client, Pool, PoolClient} from 'pg';
import {logger} from "../../logger";

interface CursorPaginationOptions {
    limit?: number;
    cursor?: string;
    type?: string;
    nounId?: number;
    direction?: 'forward' | 'backward';
}

interface PaginationCursor {
    blockTimestamp: string;
    logIndex: number;
    id: string;
}

interface PaginationResult<T> {
    data: T[];
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
}

export class AuctionEvent {
    private poolOrClient: Pool | Client | PoolClient;
    private schema: string;

    constructor(poolOrClient: Pool | Client | PoolClient, schema = 'public') {
        this.poolOrClient = poolOrClient;
        this.schema = schema;
    }

    /**
     * Enhanced cursor-based pagination with better performance
     */
    async getEventsCursor(options: CursorPaginationOptions = {}): Promise<PaginationResult<any>> {
        const {
            limit = 20,
            cursor,
            type,
            nounId,
            direction = 'forward'
        } = options;

        // Validate and clamp limit
        const validLimit = Math.min(Math.max(limit, 1), 100);

        try {
            // Decode cursor if provided
            let cursorData: PaginationCursor | null = null;
            if (cursor) {
                cursorData = this.decodeCursor(cursor);
            }

            // Build the main query
            const result = await this.executeCursorQuery({
                cursorData,
                limit: validLimit,
                type,
                nounId,
                direction
            });

            // Get approximate total count (cached for performance)
            const totalCount = await this.getApproximateCount(type);

            // Generate pagination metadata
            const pagination = this.buildPaginationMetadata(result.rows, validLimit, direction);

            return {
                data: result.rows,
                pagination: {
                    ...pagination,
                    totalCount
                }
            };

        } catch (error) {
            logger.error('Error in cursor pagination:', error);
            throw new Error(`Database error in cursor pagination: ${(error as Error).message}`);
        }
    }

    /**
     * Execute the cursor-based query with optimal performance
     */
    private async executeCursorQuery({
        cursorData,
        limit,
        type,
        nounId,
        direction
    }: {
        cursorData: PaginationCursor | null;
        limit: number;
        type?: string;
        nounId?: number;
        direction: 'forward' | 'backward';
    }) {
        let query = `
            SELECT 
                id, type, noun_id, tx_hash, block_number, block_timestamp, log_index,
                start_time, end_time, bidder, bidder_ens, value, value_usd, extended,
                winner, winner_ens, amount, amount_usd, headline, thumbnail_url,
                created_at, processed_at
            FROM ${this.schema}.auction_events
        `;

        const params: any[] = [];
        const conditions: string[] = [];

        // Add type filter
        if (type) {
            conditions.push(`type = $${params.length + 1}`);
            params.push(type);
        }

        // Add noun ID filter
        if (nounId) {
            conditions.push(`noun_id = $${params.length + 1}`);
            params.push(nounId);
        }

        // Add cursor condition for pagination
        if (cursorData) {
            const cursorCondition = direction === 'forward'
                ? `(block_timestamp, log_index, id) < ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`
                : `(block_timestamp, log_index, id) > ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`;
            
            conditions.push(cursorCondition);
            params.push(cursorData.blockTimestamp, cursorData.logIndex, cursorData.id);
        }

        // Combine conditions
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Order and limit
        const orderDirection = direction === 'forward' ? 'DESC' : 'ASC';
        query += ` ORDER BY block_timestamp ${orderDirection}, log_index ${orderDirection}, id ${orderDirection}`;
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit + 1); // Fetch one extra to determine if there are more pages

        return await this.poolOrClient.query(query, params);
    }

    /**
     * Get approximate count for performance (uses table statistics)
     */
    private async getApproximateCount(type?: string): Promise<number> {
        try {
            if (type) {
                // For filtered queries, use exact count (cached)
                const result = await this.poolOrClient.query(
                    `SELECT COUNT(*) as count FROM ${this.schema}.auction_events WHERE type = $1`,
                    [type]
                );
                return parseInt(result.rows[0].count);
            }

            // For unfiltered queries, use table statistics for speed
            const result = await this.poolOrClient.query(`
                SELECT 
                    CASE 
                        WHEN reltuples = 0 THEN (SELECT COUNT(*) FROM ${this.schema}.auction_events)
                        ELSE reltuples::BIGINT
                    END as approximate_count
                FROM pg_class 
                WHERE relname = 'auction_events'
            `);

            return parseInt(result.rows[0].approximate_count);
        } catch (error) {
            logger.warn('Could not get approximate count, defaulting to 0:', error);
            return 0;
        }
    }

    /**
     * Build pagination metadata from query results
     */
    private buildPaginationMetadata(rows: any[], requestedLimit: number, direction: 'forward' | 'backward') {
        const hasMore = rows.length > requestedLimit;
        const actualData = hasMore ? rows.slice(0, requestedLimit) : rows;

        let startCursor: string | null = null;
        let endCursor: string | null = null;
        let nextCursor: string | null = null;
        let previousCursor: string | null = null;

        if (actualData.length > 0) {
            const firstItem = actualData[0];
            const lastItem = actualData[actualData.length - 1];

            startCursor = this.encodeCursor({
                blockTimestamp: firstItem.block_timestamp,
                logIndex: firstItem.log_index,
                id: firstItem.id
            });

            endCursor = this.encodeCursor({
                blockTimestamp: lastItem.block_timestamp,
                logIndex: lastItem.log_index,
                id: lastItem.id
            });

            if (direction === 'forward') {
                nextCursor = hasMore ? endCursor : null;
                previousCursor = startCursor;
            } else {
                previousCursor = hasMore ? endCursor : null;
                nextCursor = startCursor;
            }
        }

        return {
            hasMore,
            nextCursor,
            previousCursor,
            pageInfo: {
                hasNextPage: direction === 'forward' ? hasMore : false,
                hasPreviousPage: direction === 'backward' ? hasMore : false,
                startCursor,
                endCursor
            }
        };
    }

    /**
     * Encode cursor data to base64
     */
    private encodeCursor(cursor: PaginationCursor): string {
        return Buffer.from(JSON.stringify(cursor)).toString('base64');
    }

    /**
     * Decode cursor data from base64
     */
    private decodeCursor(encodedCursor: string): PaginationCursor {
        try {
            const decoded = JSON.parse(Buffer.from(encodedCursor, 'base64').toString());
            
            // Validate cursor structure
            if (!decoded.blockTimestamp || decoded.logIndex === undefined || !decoded.id) {
                throw new Error('Invalid cursor structure');
            }

            return {
                blockTimestamp: decoded.blockTimestamp,
                logIndex: parseInt(decoded.logIndex),
                id: decoded.id
            };
        } catch (error) {
            throw new Error(`Invalid cursor format: ${(error as Error).message}`);
        }
    }

    /**
     * Get events by specific criteria with cursor pagination
     */
    async getEventsByNounId(nounId: number, options: CursorPaginationOptions = {}): Promise<PaginationResult<any>> {
        const {
            limit = 20,
            cursor,
            direction = 'forward'
        } = options;

        const validLimit = Math.min(Math.max(limit, 1), 100);

        try {
            let cursorData: PaginationCursor | null = null;
            if (cursor) {
                cursorData = this.decodeCursor(cursor);
            }

            let query = `
                SELECT *
                FROM ${this.schema}.auction_events
                WHERE noun_id = $1
            `;
            const params: any[] = [nounId];

            // Add cursor condition
            if (cursorData) {
                const cursorCondition = direction === 'forward'
                    ? `AND (block_timestamp, log_index, id) < ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`
                    : `AND (block_timestamp, log_index, id) > ($${params.length + 1}, $${params.length + 2}, $${params.length + 3})`;

                query += ` ${cursorCondition}`;
                params.push(cursorData.blockTimestamp, cursorData.logIndex, cursorData.id);
            }

            const orderDirection = direction === 'forward' ? 'DESC' : 'ASC';
            query += ` ORDER BY block_timestamp ${orderDirection}, log_index ${orderDirection}, id ${orderDirection}`;
            query += ` LIMIT $${params.length + 1}`;
            params.push(validLimit + 1);

            const result = await this.poolOrClient.query(query, params);
            const pagination = this.buildPaginationMetadata(result.rows, validLimit, direction);

            return {
                data: result.rows.slice(0, validLimit),
                pagination: {
                    ...pagination,
                    totalCount: await this.getCountByNounId(nounId)
                }
            };

        } catch (error) {
            logger.error(`Error fetching events for noun ${nounId}:`, error);
            throw new Error(`Database error when fetching events for noun: ${(error as Error).message}`);
        }
    }

    /**
     * Get count of events for a specific noun
     */
    private async getCountByNounId(nounId: number): Promise<number> {
        try {
            const result = await this.poolOrClient.query(
                `SELECT COUNT(*) as count FROM ${this.schema}.auction_events WHERE noun_id = $1`,
                [nounId]
            );
            return parseInt(result.rows[0].count);
        } catch (error) {
            logger.warn(`Could not get count for noun ${nounId}:`, error);
            return 0;
        }
    }

    /**
     * Legacy offset-based method (deprecated but maintained for compatibility)
     */
    async getEvents({
        offset = 0,
        limit = 10,
        type,
        nounId
    }: {
        offset?: number;
        limit?: number;
        type?: string;
        nounId?: number;
    }) {
        logger.warn('Using deprecated offset-based pagination. Consider migrating to cursor-based pagination.');

        let query = `
            SELECT *
            FROM ${this.schema}.auction_events
        `;
        const params: any[] = [];
        const conditions: string[] = [];

        if (type) {
            conditions.push(`type = ${params.length + 1}`);
            params.push(type);
        }

        if (nounId) {
            conditions.push(`noun_id = ${params.length + 1}`);
            params.push(nounId);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY block_timestamp DESC, log_index DESC`;
        query += ` LIMIT ${params.length + 1} OFFSET ${params.length + 2}`;
        params.push(limit, offset);

        try {
            const result = await this.poolOrClient.query(query, params);

            return {
                events: result.rows,
                count: result.rows.length,
                offset
            };
        } catch (error) {
            logger.error('Error fetching auction events:', error);
            throw new Error(`Database error when fetching events: ${(error as Error).message}`);
        }
    }

    /**
     * Get single event by ID with retry logic
     */
    async getEventById(id: string) {
        try {
            let attempts = 0;
            const maxAttempts = 3;
            const baseDelay = 500;

            while (attempts < maxAttempts) {
                const result = await this.poolOrClient.query(
                    `SELECT *
                     FROM ${this.schema}.auction_events
                     WHERE id = $1`,
                    [id]
                );

                if (result.rows.length > 0) {
                    return result.rows[0];
                }

                attempts++;
                if (attempts < maxAttempts) {
                    const delay = baseDelay * Math.pow(2, attempts - 1);
                    logger.info(`Event ${id} not found, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            logger.warn(`Event ${id} not found after ${maxAttempts} attempts`);
            return null;
        } catch (error) {
            logger.error(`Error fetching auction event ${id}:`, error);
            throw new Error(`Database error when fetching event: ${(error as Error).message}`);
        }
    }

    /**
     * Health check method
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.poolOrClient.query('SELECT 1');
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

}
