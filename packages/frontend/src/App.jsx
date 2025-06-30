import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StaticEventsList from './components/StaticEventsList';
import RealTimeEventsList from './components/RealTimeEventsList';
import { AuthProvider } from './contexts/AuthContext';

function App() {
    const [currentView, setCurrentView] = useState('static');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam === 'live' || viewParam === 'static') {
            setCurrentView(viewParam);
        }
    }, []);

    const handleViewChange = (view) => {
        setCurrentView(view);
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.pushState({}, '', url);
    };

    return (
        <AuthProvider>
            <div className="min-h-screen bg-noun-bg">
                <Header currentView={currentView} onViewChange={handleViewChange} />

                <main>
                    {currentView === 'live' ? (
                        <RealTimeEventsList />
                    ) : (
                        <StaticEventsList />
                    )}
                </main>

                <footer className="bg-noun-card border-t border-noun-border mt-16">
                    <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                        <p className="text-noun-text-muted">
                            © 2025 Nounberg Terminal | Real-time Nouns DAO auction tracker
                        </p>
                    </div>
                </footer>
            </div>
        </AuthProvider>
    );
}

export default App;
