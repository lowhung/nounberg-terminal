import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';
import EventCard from './EventCard';
import { fetchLatestEvents } from '../api/events';

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
    }, [combinedEvents, webSocketEvents]);
    
    return (
        <div className="min-h-screen bg-noun-bg p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Connection Status */}
                <ConnectionStatus isConnected={isConnected} />
                
                {/* Feed Header */}
                <div className="flex items-center justify-between p-4 bg-noun-card rounded-lg border border-noun-border">
                    <h2 className="text-2xl font-bold text-noun-text">Live Auction Events</h2>
                    <button 
                        onClick={reconnect}
                        title="Reconnect WebSocket"
                        className="p-2 bg-noun-accent hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                    >
                        <span className="text-lg">↻</span>
                    </button>
                </div>
                
                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-noun-card rounded-lg border border-noun-border">
                        <div className="w-12 h-12 border-4 border-noun-border border-t-noun-accent rounded-full animate-spin mb-4"></div>
                        <p className="text-noun-text font-medium">Loading latest events...</p>
                    </div>
                ) : combinedEvents.length > 0 ? (
                    <div className="space-y-4">
                        {combinedEvents.map((event, index) => (
                            <EventCard 
                                key={event.id} 
                                event={event} 
                                isNew={webSocketEvents.some(e => e.id === event.id)} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-noun-card rounded-lg border border-noun-border">
                        <div className="text-6xl mb-4">⏳</div>
                        <p className="text-xl font-semibold text-noun-text mb-2">
                            No events yet. Waiting for auction activity...
                        </p>
                        <p className="text-noun-text-muted">
                            The feed will update automatically when new events occur.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
