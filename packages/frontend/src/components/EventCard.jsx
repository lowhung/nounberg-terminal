import React, { useState, useEffect } from 'react';

export default function EventCard({ event, isNew = false }) {
    const [highlight, setHighlight] = useState(isNew);
    
    useEffect(() => {
        if (isNew) {
            setHighlight(true);
            const timer = setTimeout(() => setHighlight(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isNew]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp > 1000000000000
            ? new Date(timestamp) // already in milliseconds
            : new Date(timestamp * 1000); // convert seconds to milliseconds

        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const shortenAddress = (address) => {
        if (!address) return 'N/A';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    };

    const getEventTypeColor = (type) => {
        switch (type) {
            case 'created': return 'text-noun-accent';
            case 'bid': return 'text-noun-blue';
            case 'settled': return 'text-noun-orange';
            default: return 'text-noun-text-muted';
        }
    };

    const renderEventSpecificDetails = () => {
        switch (event.type) {
            case 'bid':
                return (
                    <>
                        {event.value && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Price:</span>
                                <span className="text-noun-accent font-bold">
                                    {event.valueFullDisplay || event.valueDisplay}
                                </span>
                            </div>
                        )}
                        
                        {event.valueUsd && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">USD:</span>
                                <span className="text-green-400 font-semibold">
                                    ${parseFloat(event.valueUsd).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {event.bidder && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Bidder:</span>
                                <span 
                                    className="text-noun-blue font-mono text-sm font-semibold" 
                                    title={event.bidder}
                                >
                                    {event.bidderEns || shortenAddress(event.bidder)}
                                </span>
                            </div>
                        )}

                        {event.extended && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Status:</span>
                                <span className="text-noun-red font-bold text-xs uppercase tracking-wide">
                                    Extended
                                </span>
                            </div>
                        )}
                    </>
                );

            case 'settled':
                return (
                    <>
                        {event.amount && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Final Price:</span>
                                <span className="text-noun-accent font-bold">
                                    {event.amountFullDisplay || event.amountDisplay}
                                </span>
                            </div>
                        )}
                        
                        {event.amountUsd && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">USD:</span>
                                <span className="text-green-400 font-semibold">
                                    ${parseFloat(event.amountUsd).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {event.winner && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Winner:</span>
                                <span 
                                    className="text-noun-blue font-mono text-sm font-semibold" 
                                    title={event.winner}
                                >
                                    {event.winnerEns || shortenAddress(event.winner)}
                                </span>
                            </div>
                        )}
                    </>
                );

            case 'created':
                return (
                    <>
                        <div className="flex gap-2 items-center">
                            <span className="text-noun-text-muted font-medium">Status:</span>
                            <span className="text-noun-accent font-semibold">Auction Started</span>
                        </div>
                        
                        {event.endTime && (
                            <div className="flex gap-2 items-center">
                                <span className="text-noun-text-muted font-medium">Ends:</span>
                                <span className="text-noun-text font-medium">
                                    {formatDate(event.endTime * 1000)}
                                </span>
                            </div>
                        )}
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`
            flex gap-4 p-6 
            bg-gradient-to-br from-noun-bg to-noun-card 
            border border-noun-border rounded-xl 
            transition-all duration-300 ease-in-out
            hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1
            relative overflow-hidden
            ${highlight ? 'border-noun-accent shadow-lg shadow-noun-accent/30 animate-pulse-border' : ''}
        `}>
            {/* Event Image */}
            <div className="flex-shrink-0 w-30 h-30 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-noun-border border-2 border-gray-600">
                <img
                    src={event.thumbnailUrl}
                    alt={`Noun #${event.nounId}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://placehold.co/120x120/252525/FFFFFF?text=Noun+%23${event.nounId}`;
                    }}
                />
            </div>

            {/* Event Details */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Headline */}
                <h3 className="text-xl font-semibold text-noun-text leading-tight break-words">
                    {event.headline}
                </h3>

                {/* Meta Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {/* Event Type */}
                    <div className="flex gap-2 items-center">
                        <span className="text-noun-text-muted font-medium">Type:</span>
                        <span className={`font-bold text-xs uppercase tracking-wide ${getEventTypeColor(event.type)}`}>
                            {event.type}
                        </span>
                    </div>

                    {/* Noun ID */}
                    <div className="flex gap-2 items-center">
                        <span className="text-noun-text-muted font-medium">Noun:</span>
                        <span className="text-noun-text font-semibold">#{event.nounId}</span>
                    </div>

                    {/* Event-specific details */}
                    {renderEventSpecificDetails()}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-auto pt-3 border-t border-noun-border text-sm">
                    <div className="text-noun-text-muted font-medium">
                        {formatDate(event.blockTimestamp || event.createdAt)}
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <span className="text-noun-text-dim font-mono text-xs">
                            Block #{event.blockNumber}
                        </span>
                        {event.txHash && (
                            <a
                                href={`https://etherscan.io/tx/${event.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-noun-blue hover:text-blue-400 font-semibold transition-colors duration-200 hover:underline"
                            >
                                View Tx →
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
