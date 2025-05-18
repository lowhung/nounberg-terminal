import React from 'react';
import Header from './components/Header';
import LiveFeed from './components/LiveFeed';
import EventFeed from './components/EventFeed';
import './App.css';

function App() {
    return (
        <div className="app">
            <Header />

            <main className="app-main">
                <div className="container">
                    <LiveFeed />
                    <EventFeed />
                </div>
            </main>

            <footer className="app-footer">
                <div className="container">
                    <p>© 2025 Nounberg Terminal | Real-time Nouns DAO auction tracker</p>
                </div>
            </footer>
        </div>
    );
}

export default App;
