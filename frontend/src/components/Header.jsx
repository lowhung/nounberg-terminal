import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-noun">⌐◨-◨</span>
        <h1>Nounberg Terminal</h1>
      </div>
      <nav>
        <ul>
          <li><a href="https://nouns.wtf" target="_blank" rel="noopener noreferrer">Nouns.wtf</a></li>
          <li><a href="https://etherscan.io/address/0x830BD73E4184cef73443C15111a1DF14e495C706" target="_blank" rel="noopener noreferrer">AuctionHouse</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;