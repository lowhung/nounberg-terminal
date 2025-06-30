import React from 'react';
import {useAuth} from '../contexts/AuthContext';

const ViewToggle = ({currentView, onViewChange}) => {
    const {isAuthenticated} = useAuth();

    return (
        <div className="flex items-center gap-1 bg-noun-card border border-noun-border rounded-lg p-1">
            <button
                onClick={() => onViewChange('static')}
                className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${currentView === 'static'
                    ? 'bg-noun-accent text-white shadow-sm'
                    : 'text-noun-text-muted hover:text-noun-text hover:bg-noun-bg'
                }
                `}
            >
                📚 Historical Events
            </button>

            <button
                onClick={() => onViewChange('live')}
                className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative
                    ${currentView === 'live'
                    ? 'bg-noun-accent text-white shadow-sm'
                    : 'text-noun-text-muted hover:text-noun-text hover:bg-noun-bg'
                }
                `}
            >
                📡 Live Events
                {!isAuthenticated && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                )}
            </button>
        </div>
    );
};

export default ViewToggle;
