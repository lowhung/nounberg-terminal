import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { fetchLatestEvents } from '../api/events';
import './EventFeed.css';

export default function EventFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const loadEvents = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    }
    
    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetchLatestEvents(10, currentOffset);
      
      if (response.events.length === 0) {
        setHasMore(false);
      } else {
        setEvents(prev => reset ? response.events : [...prev, ...response.events]);
        setOffset(currentOffset + response.events.length);
        setTotalCount(response.count);
        setHasMore(currentOffset + response.events.length < response.count);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Unable to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(true);
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadEvents(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="event-feed">
      <div className="feed-header">
        <h2 className="feed-title">Recent Auction Events</h2>
        {totalCount > 0 && (
          <p className="event-count">{totalCount} total events</p>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => loadEvents(true)} className="retry-button">
            Try Again
          </button>
        </div>
      )}
      
      {loading && events.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="events-list">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          
          {hasMore && (
            <div className="load-more">
              <button 
                onClick={() => loadEvents(false)}
                disabled={loading}
                className={loading ? 'loading' : ''}
              >
                {loading ? 'Loading...' : `Load More (${events.length} of ${totalCount})`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-events">
          <p>No auction events found.</p>
          <p className="small">Check back later for auction activity.</p>
        </div>
      )}
    </div>
  );
}
