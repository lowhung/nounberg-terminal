import React from 'react';
import Header from './components/Header';
import AuctionEventsList from './components/AuctionEventsList';

function App() {
    return (
        <div className="min-h-screen bg-noun-bg">
            <Header />

            <main>
                <AuctionEventsList />
            </main>

            <footer className="bg-noun-card border-t border-noun-border mt-16">
                <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                    <p className="text-noun-text-muted">
                        © 2025 Nounberg Terminal | Real-time Nouns DAO auction tracker
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
