import React, { useState, useEffect } from 'react';
import './EventCard.css';

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

    const formatEtherValue = (value) => {
        if (!value) return 'N/A';
        try {
            return parseFloat(value).toFixed(2) + ' Ξ';
        } catch (e) {
            console.error('Error formatting ether value:', e, value);
            return value;
        }
    };
    
    const shortenAddress = (address) => {
        if (!address) return 'N/A';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    };

    return (
        <div className={`event-card ${highlight ? 'new-event' : ''}`}>
            <div className="event-image">
                <img
                    src={event.thumbnailUrl}
                    alt={`Noun #${event.nounId}`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/120x120/252525/FFFFFF?text=Noun+%23' + event.nounId;
                    }}
                />
            </div>

            <div className="event-details">
                <h3 className="event-headline">{event.headline}</h3>

                <div className="event-meta">
                    <div className="event-type" data-type={event.type}>
                        <span className="label">Type:</span>
                        <span className="value">{event.type}</span>
                    </div>

                    {event.value && (
                        <div className="event-price">
                            <span className="label">Price:</span>
                            <span className="value">{formatEtherValue(event.value)}</span>
                        </div>
                    )}

                    {event.valueUsd && (
                        <div className="event-price-usd">
                            <span className="label">USD:</span>
                            <span className="value">${parseFloat(event.valueUsd).toLocaleString()}</span>
                        </div>
                    )}

                    {event.bidder && (
                        <div className="event-bidder">
                            <span className="label">Bidder:</span>
                            <span className="value" title={event.bidder}>
                                {event.bidderEns || shortenAddress(event.bidder)}
                            </span>
                        </div>
                    )}

                    {event.winner && (
                        <div className="event-winner">
                            <span className="label">Winner:</span>
                            <span className="value" title={event.winner}>
                                {event.winnerEns || shortenAddress(event.winner)}
                            </span>
                        </div>
                    )}
                </div>

                <div className="event-time">
                    {formatDate(event.createdAt)}
                </div>
            </div>
        </div>
    );
}
