import {useState, useCallback, useEffect, useRef} from 'react';
import {fetchEventsCursor, createWebSocketConnection} from '../api';

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
    const [previousCursor, setPreviousCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(undefined);

    const abortControllerRef = useRef(null);
    const refreshIntervalRef = useRef(null);

    const fetchEvents = useCallback(async (
        cursor,
        direction = 'forward'
    ) => {
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
                nounId: debouncedNounId,
                direction
            });

            setEvents(response.events);
            setNextCursor(response.pagination.nextCursor);
            setPreviousCursor(response.pagination.previousCursor);
            setHasMore(response.pagination.hasMore);
            setTotalCount(response.pagination.totalCount);

        } catch (err) {
            if (err.name === 'AbortError') {
                return;
            }

            setError(err.message || 'An error occurred while fetching events');
            console.error('Error fetching auction events:', err);
        } finally {
            setLoading(false);
        }
    }, [limit, type, debouncedNounId]);

    const refresh = useCallback(async () => {
        await fetchEvents();
    }, [fetchEvents]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loading || !nextCursor) return;
        await fetchEvents(nextCursor, 'forward');
    }, [fetchEvents, hasMore, loading, nextCursor]);

    const loadPrevious = useCallback(async () => {
        if (loading || !previousCursor) return;
        await fetchEvents(previousCursor, 'backward');
    }, [fetchEvents, loading, previousCursor]);

    const retry = useCallback(async () => {
        await refresh();
    }, [refresh]);

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
        totalCount,
        loadMore,
        refresh,
        loadPrevious,
        retry
    };
};

export const useRealTimeEvents = (onNewEvent) => {
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const connect = () => {
            try {
                wsRef.current = createWebSocketConnection();

                wsRef.current.onopen = () => {
                    setConnected(true);
                    console.log('WebSocket connected');
                };

                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'event' && message.data) {
                            onNewEvent(message.data);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                    }
                };

                wsRef.current.onclose = () => {
                    setConnected(false);
                    console.log('WebSocket disconnected');

                    setTimeout(connect, 5000);
                };

                wsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
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
    }, [onNewEvent]);

    return connected;
};
