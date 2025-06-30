import React, { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { SiweMessage } from 'siwe';
import apiClient from '../api/client';

const WalletConnection = ({ onAuthChange }) => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [provider, setProvider] = useState(null);

    useEffect(() => {
        checkAuthStatus();
    });

    const checkAuthStatus = async () => {
        try {
            const response = await apiClient.get('/auth/status', {
                headers: {
                    'X-Session-ID': getSessionId()
                }
            });
            
            if (response.data.authenticated) {
                setIsAuthenticated(true);
                setAccount(response.data.address);
                onAuthChange?.(true, response.data.address);
            }
        } catch (error) {
            setIsAuthenticated(false);
            onAuthChange?.(false, null);
        }
    };

    const getSessionId = () => {
        let sessionId = localStorage.getItem('nounberg-session-id');
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('nounberg-session-id', sessionId);
        }
        return sessionId;
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to connect your wallet');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const web3Provider = new BrowserProvider(window.ethereum);
            setProvider(web3Provider);
            
            await web3Provider.send('eth_requestAccounts', []);
            const signer = await web3Provider.getSigner();
            const address = await signer.getAddress();
            
            setAccount(address);
        } catch (error) {
            console.error('Error connecting wallet:', error);
            setError('Failed to connect wallet');
        } finally {
            setLoading(false);
        }
    };

    const createSiweMessage = async (address) => {
        const scheme = window.location.protocol.slice(0, -1);
        const domain = window.location.host;
        const origin = window.location.origin;
        
        const response = await apiClient.get('/auth/nonce', {
            headers: {
                'X-Session-ID': getSessionId()
            }
        });
        
        const message = new SiweMessage({
            scheme,
            domain,
            address,
            statement: 'Sign in with Ethereum to access Nounberg Terminal live events.',
            uri: origin,
            version: '1',
            chainId: 1,
            nonce: response.data
        });
        
        return message.prepareMessage();
    };

    const signInWithEthereum = async () => {
        if (!provider || !account) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const signer = await provider.getSigner();
            const message = await createSiweMessage(account);
            const signature = await signer.signMessage(message);

            // Verify signature with backend
            const response = await apiClient.post('/auth/verify', {
                message,
                signature
            }, {
                headers: {
                    'X-Session-ID': getSessionId()
                }
            });

            if (response.data.success) {
                setIsAuthenticated(true);
                onAuthChange?.(true, account);
            }
        } catch (error) {
            console.error('Error signing in with Ethereum:', error);
            setError('Failed to sign in with Ethereum');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout', {}, {
                headers: {
                    'X-Session-ID': getSessionId()
                }
            });
            
            setIsAuthenticated(false);
            setAccount(null);
            setProvider(null);
            onAuthChange?.(false, null);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (isAuthenticated) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">
                        {formatAddress(account)}
                    </span>
                </div>
                <button
                    onClick={logout}
                    className="px-3 py-2 text-sm text-noun-text-muted hover:text-noun-text border border-noun-border hover:border-noun-text rounded-lg transition-all duration-200"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            
            {!account ? (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
            ) : (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-3 bg-noun-card border border-noun-border rounded-lg">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-noun-text text-sm">
                            {formatAddress(account)}
                        </span>
                    </div>
                    <button
                        onClick={signInWithEthereum}
                        disabled={loading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing In...' : 'Sign In with Ethereum'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WalletConnection;
