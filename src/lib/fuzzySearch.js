/**
 * fuzzySearch.js — Feature 10: Multi-Field Fuzzy Search Engine
 * Tokenizes the query by whitespace. Every token must match
 * at least one of the target fields (partial substring match).
 * Fields: project_name, company_id, implementation_partner, country
 */

const SEARCH_FIELDS = ['project_name', 'company_id', 'implementation_partner', 'country'];

/**
 * Pre-processes a row into a lowercase search string cache.
 * Called once per row on ingest for max perf.
 * @param {Object} row
 * @returns {string}  concatenated lowercase field values
 */
export function buildSearchCache(row) {
    return SEARCH_FIELDS
        .map(f => (row[f] || '').toLowerCase())
        .join(' |||  ');
}

/**
 * Tokenized fuzzy match.
 * @param {Object} row  — must have _searchCache if pre-built, else raw fields
 * @param {string[]} tokens  — pre-split, lowercased query tokens
 * @returns {boolean}
 */
export function matchesSearch(row, tokens) {
    if (!tokens.length) return true;
    // Use pre-built cache when available
    const haystack = row._searchCache ||
        SEARCH_FIELDS.map(f => (row[f] || '').toLowerCase()).join(' ');
    // Every token must appear somewhere in the haystack
    return tokens.every(tok => haystack.includes(tok));
}

/**
 * Tokenize a raw query string.
 * @param {string} query
 * @returns {string[]}
 */
export function tokenizeQuery(query) {
    return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/**
 * Debounce helper — returns a debounced version of fn
 */
export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { fn.apply(this, args); timer = null; }, delay);
    };
}
