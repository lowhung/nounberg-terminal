import { useState, useEffect, useCallback } from 'react';

export const useQueryParams = () => {
    const [queryParams, setQueryParams] = useState({});

    // Parse query params from URL
    const parseQueryParams = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};
        
        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        
        return params;
    }, []);

    // Update query params in URL
    const updateQueryParams = useCallback((newParams) => {
        const url = new URL(window.location);
        
        // Clear existing params
        url.searchParams.forEach((_, key) => {
            url.searchParams.delete(key);
        });
        
        // Add new params (only if they have values)
        Object.entries(newParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        
        // Update URL without page reload
        window.history.replaceState({}, '', url.toString());
        
        // Update local state
        setQueryParams(parseQueryParams());
    }, [parseQueryParams]);

    // Initialize query params on mount
    useEffect(() => {
        setQueryParams(parseQueryParams());
    }, [parseQueryParams]);

    // Listen for browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            setQueryParams(parseQueryParams());
        };

        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [parseQueryParams]);

    return {
        queryParams,
        updateQueryParams
    };
};
