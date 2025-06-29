import {useCallback, useEffect, useState} from 'react';

export const useQueryParams = () => {
    const [queryParams, setQueryParams] = useState({});

    const parseQueryParams = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const params = {};

        for (const [key, value] of urlParams.entries()) {
            params[key] = value;
        }

        return params;
    }, []);

    const updateQueryParams = useCallback((newParams) => {
        const url = new URL(window.location);

        url.searchParams.forEach((_, key) => {
            url.searchParams.delete(key);
        });

        Object.entries(newParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });

        window.history.replaceState({}, '', url.toString());

        setQueryParams(parseQueryParams());
    }, [parseQueryParams]);

    useEffect(() => {
        setQueryParams(parseQueryParams());
    }, [parseQueryParams]);

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
