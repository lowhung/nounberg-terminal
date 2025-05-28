/**
 * Utility functions for formatting blockchain and currency values
 */

import {formatEther} from "ethers";

/**
 * Format USD amount with currency symbol
 * @param {string} usdValue - USD value as string 
 * @param {boolean} showCents - Whether to show cents (default: false for whole numbers)
 * @returns {string} - Formatted USD value
 */
export function formatUsd(usdValue, showCents = null) {
    if (!usdValue || usdValue === '0') return '$0';
    
    try {
        const amount = parseFloat(usdValue);
        
        if (showCents === null) {
            showCents = amount < 100 || (amount % 1 !== 0);
        }
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: showCents ? 2 : 0,
            maximumFractionDigits: showCents ? 2 : 0,
        }).format(amount);
    } catch (error) {
        console.error('Error formatting USD:', error);
        return '$0';
    }
}

/**
 * Format ETH display with Ξ symbol
 * @param {string} weiValue - Wei value as string
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted ETH display
 */
export function formatEthDisplay(weiValue, decimals = 2) {
    if (!weiValue || weiValue === '0') return '0 Ξ';
    const eth = formatEther(weiValue);
    return `${eth} Ξ`;
}

/**
 * Format full display with both ETH and USD
 * @param {string} weiValue - Wei value as string  
 * @param {string} usdValue - USD value as string
 * @returns {string} - Combined ETH and USD display
 */
export function formatFullDisplay(weiValue, usdValue) {
    const ethDisplay = formatEthDisplay(weiValue);
    if (!usdValue || usdValue === '0') {
        return ethDisplay;
    }

    const usdDisplay = formatUsd(usdValue);
    return `${ethDisplay} (${usdDisplay})`;
}

/**
 * Shorten Ethereum address for display
 * @param {string} address - Full Ethereum address
 * @param {number} startChars - Characters to show from start (default: 6)
 * @param {number} endChars - Characters to show from end (default: 4)  
 * @returns {string} - Shortened address
 */
export function shortenAddress(address, startChars = 6, endChars = 4) {
    if (!address) return 'N/A';
    if (address.length <= startChars + endChars) return address;
    
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Format timestamp for display
 * @param {string|number} timestamp - Timestamp (string or number)
 * @returns {string} - Formatted date string
 */
export function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    try {
        // Handle both string and number timestamps
        const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
        
        // Check if timestamp is in milliseconds or seconds
        const date = ts > 1000000000000 
            ? new Date(ts) // already in milliseconds
            : new Date(ts * 1000); // convert seconds to milliseconds

        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
}
