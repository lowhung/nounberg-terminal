import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';
import EventCard from './EventCard';
import { fetchLatestEvents } from '../api/events';
import './LiveFeed.css';

export default function LiveFeed() {
    const { isConnected, events: webSocketEvents, reconnect } = useWebSocket();
    const [combinedEvents, setCombinedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadInitialEvents = async () => {
            try {
                setLoading(true);
                const response = await fetchLatestEvents(10);
                setCombinedEvents(response.events);
            } catch (error) {
                console.error('Failed to load initial events:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadInitialEvents();
    }, []);
    
    useEffect(() => {
        if (webSocketEvents.length > 0) {
            const merged = [...webSocketEvents, ...combinedEvents];
            
            const uniqueEvents = merged.filter((event, index, self) =>
                index === self.findIndex(e => e.id === event.id)
            );
            
            uniqueEvents.sort((a, b) => {
                const timeA = a.createdAt > 1000000000000 ? a.createdAt : a.createdAt * 1000;
                const timeB = b.createdAt > 1000000000000 ? b.createdAt : b.createdAt * 1000;
                return timeB - timeA;
            });
            
            setCombinedEvents(uniqueEvents.slice(0, 10));
        }
    }, [webSocketEvents]);
    
    return (
        <div className="live-feed">
            <ConnectionStatus isConnected={isConnected} />
            
            <div className="feed-header">
                <h2 className="feed-title">Live Auction Events</h2>
                <button 
                    className="refresh-button" 
                    onClick={reconnect}
                    title="Reconnect WebSocket"
                >
                    ↻
                </button>
            </div>
            
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading latest events...</p>
                </div>
            ) : combinedEvents.length > 0 ? (
                <div className="events-list">
                    {combinedEvents.map((event, index) => (
                        <EventCard 
                            key={event.id} 
                            event={event} 
                            isNew={webSocketEvents.some(e => e.id === event.id)} 
                        />
                    ))}
                </div>
            ) : (
                <div className="no-events">
                    <p>No events yet. Waiting for auction activity...</p>
                    <p className="small">The feed will update automatically when new events occur.</p>
                </div>
            )}
        </div>
    );
}
