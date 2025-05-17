import React from 'react';
import {useWebSocket} from '../hooks/useWebSocket';
import EventCard from './EventCard';

export default function LiveFeed() {
    const {isConnected, events} = useWebSocket();

    return (
        <div className="live-feed">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-indicator"></span>
                <span className="status-text">
          {isConnected ? 'Connected to Nounberg Terminal' : 'Disconnected - Trying to reconnect...'}
        </span>
            </div>

            <h2 className="feed-title">Live Auction Events</h2>

            <div className="events-container">
                {events.length > 0 ? (
                    <div className="events-list">
                        {events.map(event => (
                            <EventCard key={event.id} event={event}/>
                        ))}
                    </div>
                ) : (
                    <div className="no-events">
                        <p>No events yet. Waiting for auction activity...</p>
                        <p className="small">The feed will update automatically when new events occur.</p>
                    </div>
                )}
            </div>
        </div>
    );
}