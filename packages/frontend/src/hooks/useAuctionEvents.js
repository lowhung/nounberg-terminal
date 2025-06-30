import {useState, useCallback, useEffect, useRef} from 'react';
import {fetchEventsCursor, createAuthenticatedWebSocketConnection} from '../api';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

export const useAuctionEvents = (options = {}) => {
    const {
        limit = 20,
        type,
        nounId,
        autoRefresh = false,
        refreshInterval = 30000
    } = options;

    const debouncedNounId = useDebounce(nounId, 500);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);

    const abortControllerRef = useRef(null);
    const refreshIntervalRef = useRef(null);

    const fetchEvents = useCallback(async (cursor) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError(null);

        try {
            const response = await fetchEventsCursor({
                limit,
                cursor,
                type,
                nounId: debouncedNounId
            });

            setEvents(response.events);
            setNextCursor(response.pagination.nextCursor);

        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }

            setError(err.message || 'An error occurred while fetching events');
        } finally {
            setLoading(false);
        }
    }, [limit, type, debouncedNounId]);

    const refresh = useCallback(async () => {
        await fetchEvents();
    }, [fetchEvents]);

    const loadMore = useCallback(async () => {
        if (loading || !nextCursor) return;
        await fetchEvents(nextCursor);
    }, [fetchEvents, loading, nextCursor]);

    const retry = useCallback(async () => {
        await refresh();
    }, [refresh]);
    
    const hasMore = Boolean(nextCursor);

    useEffect(() => {
        if (autoRefresh && refreshInterval > 0) {
            refreshIntervalRef.current = setInterval(() => {
                if (!loading) {
                    refresh();
                }
            }, refreshInterval);

            return () => {
                if (refreshIntervalRef.current) {
                    clearInterval(refreshIntervalRef.current);
                }
            };
        }
    }, [autoRefresh, refreshInterval, loading, refresh]);

    useEffect(() => {
        refresh();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [refresh]);
    
    return {
        events,
        loading,
        error,
        hasMore,
        loadMore,
        refresh,
        retry
    };
};

export const useRealTimeEvents = (onNewEvent, isAuthenticated = false) => {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            setConnected(false);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const connect = () => {
            try {
                wsRef.current = createAuthenticatedWebSocketConnection();

                wsRef.current.onopen = () => {
                    setConnected(true);
                    const sessionId = localStorage.getItem('nounberg-session-id');
                    const subscribeMessage = { 
                        type: 'subscribe',
                        sessionId: sessionId || undefined
                    };
                    wsRef.current?.send(JSON.stringify(subscribeMessage));
                };

                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'event' && message.data) {
                            onNewEvent(message.data);
                        } else if (message.type === 'error') {
                            console.error('WebSocket authentication error:', message.message);
                            setConnected(false);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                    }
                };

                wsRef.current.onclose = () => {
                    setConnected(false);

                    setTimeout(connect, 5000);
                };

                wsRef.current.onerror = (error) => {
                };
            } catch (error) {
                setConnected(false);

                setTimeout(connect, 5000);
            }
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [onNewEvent, isAuthenticated]);

    return connected;
};
