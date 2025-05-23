import apiClient from './client';

/**
 * API methods for interacting with auction events
 */

/**
 * Fetch the most recent auction events
 * @param {number} limit - Maximum number of events to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} - Response with events and pagination info
 */
export async function fetchLatestEvents(limit = 10, offset = 0) {
  try {
    const response = await apiClient.get('/api/events', {
      params: { limit, offset }
    });
    
    return {
      events: response.data.data || [],
      count: response.data.count || 0,
      offset: response.data.offset || 0
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      events: [],
      count: 0,
      offset: 0
    };
  }
}

/**
 * Fetch a specific event by ID
 * @param {string} eventId - The event ID to fetch
 * @returns {Promise<Object|null>} - The event object or null if not found
 */
export async function fetchEvent(eventId) {
  try {
    const response = await apiClient.get(`/api/events/${eventId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

/**
 * Fetch events by type
 * @param {string} type - Event type (created, bid, settled)
 * @param {number} limit - Maximum number of events to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} - Response with events and pagination info
 */
export async function fetchEventsByType(type, limit = 10, offset = 0) {
  try {
    const response = await apiClient.get('/api/events', {
      params: { type, limit, offset }
    });
    
    return {
      events: response.data.data || [],
      count: response.data.count || 0,
      offset: response.data.offset || 0
    };
  } catch (error) {
    console.error(`Error fetching events of type ${type}:`, error);
    return {
      events: [],
      count: 0,
      offset: 0
    };
  }
}

/**
 * Fetch events for a specific Noun
 * @param {number} nounId - The Noun ID to fetch events for
 * @param {number} limit - Maximum number of events to fetch
 * @param {number} offset - Pagination offset
 * @returns {Promise<Object>} - Response with events and pagination info
 */
export async function fetchEventsByNoun(nounId, limit = 10, offset = 0) {
  try {
    const response = await apiClient.get('/api/events', {
      params: { nounId, limit, offset }
    });
    
    return {
      events: response.data.data || [],
      count: response.data.count || 0,
      offset: response.data.offset || 0
    };
  } catch (error) {
    console.error(`Error fetching events for Noun #${nounId}:`, error);
    return {
      events: [],
      count: 0,
      offset: 0
    };
  }
}

/**
 * Check API health
 * @returns {Promise<Object>} - Health status
 */
export async function checkHealth() {
  try {
    const response = await apiClient.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Error checking API health:', error);
    return { status: 'error', message: 'API unavailable' };
  }
}
