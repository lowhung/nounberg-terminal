import apiClient from './client';

/**
 * API methods for interacting with auction events
 */

/**
 * Fetch events with cursor-based pagination (recommended)
 * @param {Object} options - Pagination and filter options
 * @param {number} options.limit - Maximum number of events to fetch (default: 20)
 * @param {string} options.cursor - Cursor for pagination
 * @param {string} options.type - Event type filter (created, bid, settled)
 * @param {number} options.nounId - Filter by specific Noun ID
 * @returns {Promise<Object>} - Response with events and cursor pagination info
 */
export async function fetchEventsCursor(options = {}) {
    const {limit = 20, cursor, type, nounId} = options;

    try {
        const params = {limit};
        if (cursor) params.cursor = cursor;
        if (type) params.type = type;
        if (nounId) params.nounId = nounId;

        const response = await apiClient.get('/api/events', {params});

        return {
            events: response.data.data || [],
            pagination: response.data.pagination || {},
            meta: response.data.meta || {}
        };
    } catch (error) {
        console.error('Error fetching events with cursor:', error);
        throw error;
    }
}

/**
 * Create a WebSocket connection to the events stream
 * @returns {WebSocket} - WebSocket connection
 */
export function createWebSocketConnection() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const ws = new WebSocket(`${wsUrl}/ws`);

    return ws;
}

/**
 * Create an authenticated WebSocket connection
 * @returns {WebSocket} - WebSocket connection with session info
 */
export function createAuthenticatedWebSocketConnection() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

    const sessionId = localStorage.getItem('nounberg-session-id');

    const url = sessionId 
        ? `${wsUrl}/ws?sessionId=${encodeURIComponent(sessionId)}`
        : `${wsUrl}/ws`;
    
    return new WebSocket(url);
}
