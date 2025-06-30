import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({
    isAuthenticated: false,
    address: null,
    setAuthState: () => {}
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [address, setAddress] = useState(null);

    const setAuthState = (authenticated, userAddress) => {
        setIsAuthenticated(authenticated);
        setAddress(userAddress);
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            address,
            setAuthState
        }}>
            {children}
        </AuthContext.Provider>
    );
};
