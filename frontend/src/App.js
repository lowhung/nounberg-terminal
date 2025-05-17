import React from 'react';
import LiveFeed from './components/LiveFeed';
import './App.css';

function App() {
    return (
        <div className="app">
            <header className="app-header">
                <h1>Nounberg Terminal</h1>
                <p className="subtitle">Real-time Nouns DAO auction tracker</p>
            </header>

            <main className="app-main">
                <LiveFeed/>
            </main>

            <footer className="app-footer">
                <p>© 2025 Nounberg Terminal</p>
            </footer>
        </div>
    );
}

export default App;