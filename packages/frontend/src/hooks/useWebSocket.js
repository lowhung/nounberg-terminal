import { useState, useEffect, useCallback, useRef } from 'react';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const isConnectingRef = useRef(false);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (isConnectingRef.current) {
            console.log('Connection attempt already in progress, skipping');
            return;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            console.log('WebSocket already connected or connecting');
            return;
        }

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.log(`Maximum reconnect attempts (${maxReconnectAttempts}) reached. Giving up.`);
            return;
        }

        isConnectingRef.current = true;

        const apiUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';
        const wsUrl = `${apiUrl}/ws`;

        console.log(`Connecting to WebSocket at ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1})`);

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected successfully');
                setIsConnected(true);
                isConnectingRef.current = false;
                reconnectAttemptsRef.current = 0;

                socket.send(JSON.stringify({ type: 'subscribe' }));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    switch (data.type) {
                        case 'welcome':
                            console.log('Connected to server:', data.message);
                            break;
                            
                        case 'subscribed':
                            console.log('Successfully subscribed to events');
                            break;
                            
                        case 'event':
                            if (data.data) {
                                console.log('Received auction event:', data.data);
                                setLastEvent(data.data);
                                setEvents(prevEvents => {
                                    const exists = prevEvents.some(e => e.id === data.data.id);
                                    if (exists) return prevEvents;
                                    return [data.data, ...prevEvents].slice(0, 10);
                                });
                            }
                            break;
                            
                        case 'ping':
                            socket.send(JSON.stringify({ type: 'pong' }));
                            break;
                            
                        case 'pong':
                            console.log('Received pong from server');
                            break;
                            
                        default:
                            console.log('Unknown message type:', data.type);
                    }
                } catch (err) {
                    console.error('Error processing WebSocket message:', err);
                }
            };

            socket.onclose = (event) => {
                console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
                setIsConnected(false);
                isConnectingRef.current = false;

                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    
                    console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current} in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                isConnectingRef.current = false;
            };

        } catch (err) {
            console.error('Error creating WebSocket connection:', err);
            isConnectingRef.current = false;
            setIsConnected(false);

            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
            }
        }
    }, []);

    const disconnect = useCallback(() => {
        console.log('Disconnecting WebSocket');
        
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.close(1000, 'User initiated disconnect');
            socketRef.current = null;
        }

        isConnectingRef.current = false;
        setIsConnected(false);
        reconnectAttemptsRef.current = 0;
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
