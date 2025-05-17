import React from 'react';
import './EventCard.css';

export default function EventCard({event}) {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp > 1000000000000
            ? new Date(timestamp) // already in milliseconds
            : new Date(timestamp * 1000); // convert seconds to milliseconds

        return date.toLocaleString();
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

    return (
        <div className="event-card">
            <div className="event-image">
                <img
                    src={event.thumbnailUrl}
                    alt={`Noun #${event.nounId}`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placekitten.com/100/100'; // fallback image
                    }}
                />
            </div>

            <div className="event-details">
                <h3 className="event-headline">{event.headline}</h3>

                <div className="event-meta">
                    <div className="event-type">
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
                            <span className="value">{event.bidderEns || event.bidder}</span>
                        </div>
                    )}

                    {event.winner && (
                        <div className="event-winner">
                            <span className="label">Winner:</span>
                            <span className="value">{event.winnerEns || event.winner}</span>
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
