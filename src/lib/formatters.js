/**
 * formatters.js — Feature 2: Financial & Numeric Value Sanitation
 * All formatting applied at render time. Never stored in state.
 */

const _currencyFmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const _numberFmt = new Intl.NumberFormat('en-US');

/**
 * Format a dollar amount: $1,234,567
 * @param {number|string} val
 * @returns {string}
 */
export function formatCurrency(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '$0';
    return _currencyFmt.format(n);
}

/**
 * Format ROI percent — clamped to 2 decimal places, signed.
 * @param {number|string} val
 * @returns {string}
 */
export function formatROI(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '0.00%';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/**
 * Format integer with commas: 69,944
 */
export function formatInt(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return '0';
    return _numberFmt.format(n);
}

/**
 * Format large numbers with K/M suffix for KPI display
 */
export function formatKPI(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '0';
    if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
}

/**
 * Format robots count for KPI
 */
export function formatRobots(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return _numberFmt.format(n);
}

/**
 * Format row count for KPI
 */
export function formatRows(val) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

/**
 * Determine color class for ROI value
 */
export function roiColorClass(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return 'neutral';
    if (n >= 50) return 'roi-excellent';
    if (n >= 0) return 'roi-positive';
    return 'roi-negative';
}

/**
 * Status badge color class
 */
export function statusClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed': return 'status-completed';
        case 'active': return 'status-active';
        case 'failed': return 'status-failed';
        case 'paused': return 'status-paused';
        default: return 'status-unknown';
    }
}
