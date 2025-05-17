import {useState, useEffect, useCallback, useRef} from 'react';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
            socketRef.current.close();
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
        const wsUrl = `${wsProtocol}//${host}/ws`;

        console.log(`Connecting to WebSocket at ${wsUrl}`);

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);

                console.log('Subscribing to events');
                socket.send(JSON.stringify({type: 'subscribe'}));
            };

            socket.onmessage = (event) => {
                try {
                    console.log('Raw WebSocket message received:', event.data);
                    const data = JSON.parse(event.data);
                    console.log('Parsed WebSocket message:', data);

                    if (data.type === 'welcome') {
                        console.log('Connected to server:', data.message);
                    } else if (data.type === 'subscribed') {
                        console.log('Successfully subscribed to events');
                    } else if (data.type === 'event' && data.data) {
                        console.log('Received auction event:', data.data);

                        setLastEvent(data.data);

                        setEvents(prevEvents => {
                            const newEvents = [data.data, ...prevEvents].slice(0, 10);
                            console.log('Updated events array:', newEvents);
                            return newEvents;
                        });
                    } else if (data.type === 'test') {
                        console.log('Received test message:', data.message);
                    }
                } catch (err) {
                    console.error('Error processing WebSocket message:', err);
                }
            };

            socket.onclose = (event) => {
                console.log(`WebSocket disconnected with code ${event.code}. Reason: ${event.reason || 'No reason provided'}`);
                setIsConnected(false);

                if (event.code !== 1000) {
                    console.log('Scheduling reconnection attempt...');
                    reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (err) {
            console.error('Error establishing WebSocket connection:', err);
            setIsConnected(false);

            reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
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