import React, {useCallback, useEffect, useState} from 'react';
import {useAuctionEvents, useRealTimeEvents} from '../hooks/useAuctionEvents';
import EventCard from "./EventCard";
import {useQueryParams} from '../hooks/useQueryParams';

export const AuctionEventsList = () => {
    const {queryParams, updateQueryParams} = useQueryParams();
    const [filter, setFilter] = useState({
        type: queryParams.type || '',
        nounId: queryParams.nounId || ''
    });
    const [currentPage, setCurrentPage] = useState('initial');
    const [liveEvents, setLiveEvents] = useState([]);
    const [newEventIds, setNewEventIds] = useState(new Set());
    const {
        events,
        loading,
        error,
        hasMore,
        loadMore,
        refresh,
        backToLive,
        retry
    } = useAuctionEvents({
        limit: 20,
        type: filter.type || undefined,
        nounId: filter.nounId ? parseInt(filter.nounId) : undefined,
        autoRefresh: false, 
        refreshInterval: 30000
    });

    const isActivelyQuerying = Boolean(filter.type || filter.nounId);

    const handleNewEvent = useCallback((newEvent) => {
        // Pause consuming new websocket events if user is actively querying (filtering)
        // or if user has navigated away from the initial live view
        // This matches the behavior of "Load More" which also pauses live events
        if (isActivelyQuerying || currentPage === 'navigated') {
            return;
        }

        const matchesTypeFilter = !filter.type || newEvent.type === filter.type;
        const matchesNounFilter = !filter.nounId || newEvent.nounId === parseInt(filter.nounId);

        if (matchesTypeFilter && matchesNounFilter) {
            setLiveEvents(prev => {
                if (prev.some(event => event.id === newEvent.id)) {
                    return prev;
                }

                return [newEvent, ...prev].slice(0, 20);
            });

            setNewEventIds(prev => new Set([...prev, newEvent.id]));

            setTimeout(() => {
                setNewEventIds(prev => {
                    const updated = new Set(prev);
                    updated.delete(newEvent.id);
                    return updated;
                });
            }, 3000);
        }
    }, [filter.type, filter.nounId, isActivelyQuerying, currentPage]);

    const wsConnected = useRealTimeEvents(handleNewEvent);

    const displayEvents = React.useMemo(() => {
        if (currentPage === 'initial' && liveEvents.length > 0) {
            const uniqueFetchedEvents = events.filter(e => !liveEvents.some(le => le.id === e.id));

            const combined = [...liveEvents, ...uniqueFetchedEvents];
            return combined.slice(0, 20);
        }

        return events;
    }, [liveEvents, events, currentPage]);

    const handleFilterChange = (key, value) => {
        const newFilter = {
            ...filter,
            [key]: value
        };
        setFilter(newFilter);
        
        updateQueryParams({
            type: newFilter.type || undefined,
            nounId: newFilter.nounId || undefined
        });
        
        const hasAnyFilter = newFilter.type || newFilter.nounId;
        setCurrentPage(hasAnyFilter ? 'navigated' : 'initial');
        
        setLiveEvents([]);
        setNewEventIds(new Set());
    };

    const clearFilters = () => {
        setFilter({type: '', nounId: ''});
        
        updateQueryParams({});
        
        setCurrentPage('initial');
        setLiveEvents([]);
        setNewEventIds(new Set());
    };

    const getDisplayText = () => {
        if (isActivelyQuerying) {
            return `Browsing filtered auction events`;
        }
        if (currentPage === 'initial' && liveEvents.length > 0) {
            return `Showing live events + recent history`;
        }
        if (currentPage === 'initial') {
            return `Live auction events - waiting for updates`;
        }
        return `Browsing historical auction events`;
    };

    const handleLoadMore = useCallback(async () => {
        await loadMore();
        setCurrentPage('navigated');
    }, [loadMore]);

    const handleBackToLive = useCallback(async () => {
        // Clear filters when going back to live view
        setFilter({type: '', nounId: ''});
        updateQueryParams({});
        
        await backToLive();
        setCurrentPage('initial');
        setLiveEvents([]);
        setNewEventIds(new Set());
    }, [backToLive, updateQueryParams]);

    const handleRefresh = useCallback(async () => {
        await refresh();
        setCurrentPage('initial');
    }, [refresh]);

    // Sync filter state with URL query params and set appropriate page mode
    useEffect(() => {
        const newFilter = {
            type: queryParams.type || '',
            nounId: queryParams.nounId || ''
        };
        setFilter(newFilter);
        
        // Set page mode based on whether there are any filters
        const hasAnyFilter = newFilter.type || newFilter.nounId;
        setCurrentPage(hasAnyFilter ? 'navigated' : 'initial');
    }, [queryParams]);

    useEffect(() => {
        if (currentPage === 'initial') {
            refresh();
        }
    }, [currentPage, refresh]);

    if (error) {
        return (
            <div className="min-h-screen bg-noun-bg flex items-center justify-center p-6">
                <div
                    className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-noun-text mb-2">Error Loading Events</h3>
                    <p className="text-noun-text-muted mb-6">{error}</p>
                    <button
                        onClick={retry}
                        className="btn-primary w-full"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-noun-bg">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-noun-bg/95 backdrop-blur-sm border-b border-noun-border">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    {/* Connection Status */}
                    <div className={`
                        flex items-center gap-3 mb-6 p-3 rounded-lg border transition-all duration-300
                        ${wsConnected
                        ? 'bg-green-900/20 border-green-500/30 text-green-400'
                        : 'bg-red-900/20 border-red-500/30 text-red-400'
                    }
                    `}>
                        <div className={`
                            w-3 h-3 rounded-full transition-all duration-300
                            ${wsConnected
                            ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse'
                            : 'bg-red-400 shadow-lg shadow-red-400/50'
                        }
                        `}></div>
                        <span className="font-medium">
                            {wsConnected 
                                ? (isActivelyQuerying 
                                    ? 'Connected to Nounberg Terminal (browsing mode - live events paused)' 
                                    : currentPage === 'navigated'
                                    ? 'Connected to Nounberg Terminal (browsing historical events)'
                                    : 'Connected to Nounberg Terminal (live mode)'
                                  )
                                : 'Disconnected - Trying to reconnect...'
                            }
                        </span>
                        {currentPage === 'initial' && liveEvents.length > 0 && (
                            <span className="ml-auto text-xs bg-noun-accent/20 text-noun-accent px-2 py-1 rounded-full">
                                {liveEvents.length} live events
                            </span>
                        )}
                    </div>

                    {/* Header Content */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-noun-text mb-2">
                                {isActivelyQuerying || currentPage === 'navigated' 
                                    ? 'Browse Auction Events'
                                    : 'Live Auction Events'
                                }
                            </h2>
                            <div className="text-noun-text-muted">
                                <p>{getDisplayText()}</p>
                                {currentPage === 'initial' && liveEvents.length > 0 && (
                                    <p className="text-xs text-noun-accent mt-1">
                                        {liveEvents.length} live events visible
                                    </p>
                                )}
                            </div>
                        </div>

                        {(currentPage === 'navigated' || isActivelyQuerying) && (
                            <button
                                onClick={handleBackToLive}
                                className="btn-primary"
                            >
                                Back to Live View
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div
                        className="flex flex-wrap items-end gap-4 p-4 bg-noun-card rounded-lg border border-noun-border">
                        <div className="flex flex-col gap-2">
                            <label htmlFor="type-filter" className="text-sm font-medium text-noun-text-muted">
                                Event Type:
                            </label>
                            <select
                                id="type-filter"
                                value={filter.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="px-3 py-2 bg-noun-bg border border-noun-border rounded-lg text-noun-text focus:ring-2 focus:ring-noun-accent focus:border-transparent transition-all duration-200"
                            >
                                <option value="">All Types</option>
                                <option value="created">Created</option>
                                <option value="bid">Bid</option>
                                <option value="settled">Settled</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="noun-filter" className="text-sm font-medium text-noun-text-muted">
                                Noun ID:
                            </label>
                            <input
                                id="noun-filter"
                                type="number"
                                placeholder="Enter Noun ID"
                                value={filter.nounId}
                                onChange={(e) => handleFilterChange('nounId', e.target.value)}
                                className="px-3 py-2 bg-noun-bg border border-noun-border rounded-lg text-noun-text placeholder-noun-text-muted focus:ring-2 focus:ring-noun-accent focus:border-transparent transition-all duration-200 w-32"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={clearFilters}
                                className="btn-secondary"
                            >
                                Clear Filters
                            </button>

                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                title="Refresh events"
                                className={`
                                    px-3 py-2 rounded-lg font-medium transition-all duration-200
                                    ${loading
                                    ? 'bg-noun-border text-noun-text-muted cursor-not-allowed'
                                    : 'bg-noun-accent hover:bg-green-600 text-white hover:shadow-lg'
                                }
                                `}
                            >
                                <span className={loading ? 'animate-spin' : ''}>↻</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Events List */}
                <div className="space-y-4 mb-8">
                    {displayEvents.length === 0 && !loading ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-semibold text-noun-text mb-2">No events found</h3>
                            <p className="text-noun-text-muted">
                                {currentPage === 'initial'
                                    ? 'Waiting for live auction events...'
                                    : 'Try adjusting your filters or check back later.'
                                }
                            </p>
                        </div>
                    ) : (
                        displayEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isNew={newEventIds.has(event.id)}
                            />
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-noun-card rounded-lg border border-noun-border">
                    <div className="text-noun-text-muted">
                        <span>Showing {displayEvents.length} events</span>
                        {currentPage === 'initial' && liveEvents.length > 0 && (
                            <span className="text-noun-accent"> ({liveEvents.length} live)</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Show "Back to Live" button when paginated away */}
                        {currentPage === 'navigated' && (
                            <button
                                onClick={handleBackToLive}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-noun-border hover:bg-gray-600 disabled:bg-noun-border disabled:text-noun-text-muted text-noun-text font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                            >
                                ← Back to Live
                            </button>
                        )}

                        {/* Only show "Load More" if there are more events to load */}
                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-noun-accent hover:bg-green-600 disabled:bg-noun-border disabled:text-noun-text-muted text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin">↻</span>
                                        Loading...
                                    </>
                                ) : (
                                    'Load More →'
                                )}
                            </button>
                        )}

                        {/* Show message when no more events */}
                        {!hasMore && currentPage === 'navigated' && (
                            <span className="text-noun-text-muted italic">No more events</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading Overlay for Initial Load */}
            {loading && displayEvents.length === 0 && (
                <div className="fixed inset-0 bg-noun-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div
                        className="bg-noun-card border border-noun-border rounded-xl p-8 text-center max-w-sm w-full mx-4">
                        <div
                            className="w-12 h-12 border-4 border-noun-border border-t-noun-accent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-noun-text font-medium">Loading events...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctionEventsList;
