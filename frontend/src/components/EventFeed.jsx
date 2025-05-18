import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';
import { fetchLatestEvents } from '../api/events';
import './EventFeed.css';

export default function EventFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadEvents = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setCursor(null);
    }
    
    try {
      const newCursor = reset ? null : cursor;
      const data = await fetchLatestEvents(10, newCursor);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setEvents(prev => reset ? data : [...prev, ...data]);
        setCursor(data[data.length - 1]?.id);
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
      <h2 className="feed-title">Recent Auction Events</h2>
      
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
                {loading ? 'Loading...' : 'Load More'}
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
