import React, {useEffect, useState} from 'react';
import {useAuctionEvents} from '../hooks/useAuctionEvents';
import EventCard from "./EventCard";
import {useQueryParams} from '../hooks/useQueryParams';

export const StaticEventsList = () => {
    const {queryParams, updateQueryParams} = useQueryParams();
    const [filter, setFilter] = useState({
        type: queryParams.type || '',
        nounId: queryParams.nounId || ''
    });

    const {
        events,
        loading,
        error,
        hasMore,
        loadMore,
        refresh,
        retry
    } = useAuctionEvents({
        limit: 20,
        type: filter.type || undefined,
        nounId: filter.nounId ? parseInt(filter.nounId) : undefined,
        autoRefresh: false
    });

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
    };

    const clearFilters = () => {
        setFilter({type: '', nounId: ''});
        updateQueryParams({});
    };

    // Sync filter state with URL query params
    useEffect(() => {
        const newFilter = {
            type: queryParams.type || '',
            nounId: queryParams.nounId || ''
        };
        setFilter(newFilter);
    }, [queryParams]);

    if (error) {
        return (
            <div className="min-h-screen bg-noun-bg flex items-center justify-center p-6">
                <div
                    className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-xl p-8 max-w-md w-full text-center">
                    <div className="text-red-400 text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-noun-text mb-2">Error Loading Events</h3>
                    <p className="text-noun-text-muted mb-6">{error}</p>
                    <button onClick={retry} className="btn-primary w-full">
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
                    {/* Header Content */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-noun-text mb-2">
                                Historical Auction Events
                            </h2>
                            <p className="text-noun-text-muted">
                                Browse past Nouns DAO auction events
                            </p>
                        </div>
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
                            <button onClick={clearFilters} className="btn-secondary">
                                Clear Filters
                            </button>

                            <button
                                onClick={refresh}
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
                    {events.length === 0 && !loading ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-semibold text-noun-text mb-2">No events found</h3>
                            <p className="text-noun-text-muted">
                                Try adjusting your filters or check back later.
                            </p>
                        </div>
                    ) : (
                        events.map((event) => (
                            <EventCard key={event.id} event={event}/>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-noun-card rounded-lg border border-noun-border">
                    <div className="text-noun-text-muted">
                        <span>Showing {events.length} events</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Load More button */}
                        {hasMore && (
                            <button
                                onClick={loadMore}
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
                        {!hasMore && events.length > 0 && (
                            <span className="text-noun-text-muted italic">No more events</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading Overlay for Initial Load */}
            {loading && events.length === 0 && (
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

export default StaticEventsList;
