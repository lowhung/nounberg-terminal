import { useState, useEffect, useCallback, useRef } from 'react';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            socketRef.current.close();
        }

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log(`Maximum reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
        const wsUrl = `${wsProtocol}//${host}/ws`;

        console.log(`Connecting to WebSocket at ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1})`);

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected successfully');
                setIsConnected(true);
                reconnectAttemptsRef.current = 0; // Reset counter on successful connection

                console.log('Subscribing to events');
                socket.send(JSON.stringify({ type: 'subscribe' }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'welcome') {
                        console.log('Connected to server:', data.message);
                    } else if (data.type === 'subscribed') {
                        console.log('Successfully subscribed to events');
                    } else if (data.type === 'event' && data.data) {
                        console.log('Received auction event:', data.data);

                        setLastEvent(data.data);

                        setEvents(prevEvents => {
                            // Check if event already exists
                            const exists = prevEvents.some(e => e.id === data.data.id);
                            if (exists) {
                                return prevEvents;
                            }
                            
                            // Add new event at the beginning and limit to 10
                            const newEvents = [data.data, ...prevEvents].slice(0, 10);
                            return newEvents;
                        });
                    } else if (data.type === 'ping') {
                        // Respond to ping with pong to keep connection alive
                        socket.send(JSON.stringify({ type: 'pong' }));
                    }
                } catch (err) {
                    console.error('Error processing WebSocket message:', err);
                }
            };

            socket.onclose = (event) => {
                console.log(`WebSocket disconnected with code ${event.code}. Reason: ${event.reason || 'No reason provided'}`);
                setIsConnected(false);

                if (event.code !== 1000) { // 1000 is normal closure
                    reconnectAttemptsRef.current++; 
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff with max 30s
                    
                    console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current} in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (err) {
            console.error('Error establishing WebSocket connection:', err);
            setIsConnected(false);

            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current) {
            console.log('Closing WebSocket connection');
            socketRef.current.close(1000, 'User initiated disconnect');
            socketRef.current = null;
        }

        setIsConnected(false);
    }, []);

    useEffect(() => {
        console.log('useWebSocket hook initializing');
        connect();

        return () => {
            console.log('useWebSocket hook cleaning up');
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        lastEvent,
        events,
        reconnect: connect,
        disconnect
    };
}
