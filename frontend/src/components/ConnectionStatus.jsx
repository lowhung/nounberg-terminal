import React from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = ({ isConnected }) => {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-indicator"></div>
      <span className="status-text">
        {isConnected ? 'Live: Connected to auction feed' : 'Disconnected: Trying to reconnect...'}
      </span>
    </div>
  );
};

export default ConnectionStatus;