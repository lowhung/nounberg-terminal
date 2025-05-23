import React from 'react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-noun-bg via-noun-card to-noun-bg border-b border-noun-border">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-noun-text mb-2">
            Nounberg Terminal
          </h1>
          <p className="text-lg text-noun-text-muted">
            Real-time Nouns DAO auction tracker
          </p>
        </div>
      </div>
    </header>
  );
}
