import React from 'react';

export default function ConnectionStatus({ isConnected }) {
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
      ${isConnected 
        ? 'bg-green-900/20 border-green-500/30 text-green-400' 
        : 'bg-red-900/20 border-red-500/30 text-red-400'
      }
    `}>
      <div className={`
        w-3 h-3 rounded-full transition-all duration-300
        ${isConnected 
          ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' 
          : 'bg-red-400 shadow-lg shadow-red-400/50'
        }
      `}></div>
      <span className="font-medium">
        {isConnected ? 'Connected to Nounberg Terminal' : 'Disconnected - Trying to reconnect...'}
      </span>
    </div>
  );
}
