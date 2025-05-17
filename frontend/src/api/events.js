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
      throw new Error(`API error: ${response.status}`);
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
    const response = await fetch(`/api/events?id=${eventId}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}