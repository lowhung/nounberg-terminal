/**
 * API methods for interacting with auction events
 */

/**
 * Fetch the most recent auction events
 * @param {number} limit - Maximum number of events to fetch
 * @param {string} cursor - Pagination cursor
 * @returns {Promise<Array>} - Array of events
 */
export async function fetchLatestEvents(limit = 10, cursor = null) {
  try {
    let url = `/api/events?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Fetch a specific event by ID
 * @param {string} eventId - The event ID to fetch
 * @returns {Promise<Object|null>} - The event object or null if not found
 */
export async function fetchEvent(eventId) {
  try {
    const response = await fetch(`/api/events/${eventId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

/**
 * Fetch events by type
 * @param {string} type - Event type (AuctionCreated, AuctionBid, AuctionSettled)
 * @param {number} limit - Maximum number of events to fetch
 * @param {string} cursor - Pagination cursor
 * @returns {Promise<Array>} - Array of events
 */
export async function fetchEventsByType(type, limit = 10, cursor = null) {
  try {
    let url = `/api/events?type=${encodeURIComponent(type)}&limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching events of type ${type}:`, error);
    return [];
  }
}

/**
 * Fetch events for a specific Noun
 * @param {number} nounId - The Noun ID to fetch events for
 * @returns {Promise<Array>} - Array of events
 */
export async function fetchEventsByNoun(nounId) {
  try {
    const response = await fetch(`/api/events?nounId=${nounId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`Error fetching events for Noun #${nounId}:`, error);
    return [];
  }
}
