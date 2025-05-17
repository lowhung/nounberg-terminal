import React from 'react';
import EventCard from './EventCard';
import './EventFeed.css';

const EventFeed = ({ events, loading }) => {
  if (loading) {
    return (
      <div className="event-feed-loading">
        <div className="loader"></div>
        <p>Loading auction events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="event-feed-empty">
        <p>No auction events found. Events will appear here as they occur.</p>
      </div>
    );
  }

  return (
    <div className="event-feed">
      <h2>Latest Noun Auction Events</h2>
      <div className="event-list">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default EventFeed;