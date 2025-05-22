import React from 'react';
import './ConnectionStatus.css';

export default function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="status-indicator"></span>
      <span className="status-text">
        {isConnected ? 'Connected to Nounberg Terminal' : 'Disconnected - Trying to reconnect...'}
      </span>
    </div>
  );
}
