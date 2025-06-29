import React from 'react';
import WalletConnection from './WalletConnection';
import ViewToggle from './ViewToggle';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ currentView, onViewChange }) {
  const { setAuthState } = useAuth();

  const handleAuthChange = (authenticated, address) => {
    setAuthState(authenticated, address);
  };

  return (
    <header className="bg-gradient-to-r from-noun-bg via-noun-card to-noun-bg border-b border-noun-border">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Title Section */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-noun-text mb-2">
              Nounberg Terminal
            </h1>
            <p className="text-lg text-noun-text-muted">
              Real-time Nouns DAO auction tracker
            </p>
          </div>
          
          {/* Navigation and Auth Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <ViewToggle currentView={currentView} onViewChange={onViewChange} />
            <WalletConnection onAuthChange={handleAuthChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
