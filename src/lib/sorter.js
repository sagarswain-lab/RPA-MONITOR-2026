/**
 * sorter.js — Features 4 & 9: Single + Multi-Column Sort
 * Pure sort utilities. Used by stateEngine._recompute()
 * and exposed here for direct imports where needed.
 */

/**
 * Numeric-aware comparator for a single field.
 * Handles both string and numeric types correctly.
 */
function compareField(a, b, key) {
    const av = a[key];
    const bv = b[key];
    // Numeric comparison
    if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
    }
    // Coerce for fields that should be numeric but stored as strings
    const an = parseFloat(av);
    const bn = parseFloat(bv);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    // String comparison
    const as = String(av || '').toLowerCase();
    const bs = String(bv || '').toLowerCase();
    return as < bs ? -1 : as > bs ? 1 : 0;
}

/**
 * Sort an array by a single column.
 * @param {Object[]} arr
 * @param {string} key     column key
 * @param {'asc'|'desc'} dir
 * @returns {Object[]}  new sorted array (original unchanged)
 */
export function sortSingle(arr, key, dir) {
    if (!key || !arr.length) return arr;
    return arr.slice().sort((a, b) => {
        const d = compareField(a, b, key);
        return dir === 'asc' ? d : -d;
    });
}

/**
 * Multi-column compound sort (Feature 9).
 * @param {Object[]} arr
 * @param {Array<{key:string, dir:string}>} sortKeys  priority list
 * @returns {Object[]}  new sorted array
 */
export function sortMulti(arr, sortKeys) {
    if (!sortKeys.length || !arr.length) return arr;
    return arr.slice().sort((a, b) => {
        for (const { key, dir } of sortKeys) {
            const d = compareField(a, b, key);
            if (d !== 0) return dir === 'asc' ? d : -d;
        }
        return 0;
    });
}

/**
 * Toggle sort direction or set new key.
 * @param {Object|null} current  { key, dir }
 * @param {string} key
 * @returns {{ key, dir }}
 */
export function toggleSort(current, key) {
    if (!current || current.key !== key) return { key, dir: 'asc' };
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

/**
 * The three sortable columns for Feature 4/9.
 */
export const SORTABLE_COLS = ['budget_usd', 'roi_percent', 'employee_hours_saved'];
