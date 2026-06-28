/**
 * SearchBar.jsx — Feature 10: Multi-Field Fuzzy Search Engine
 * Debounced 150ms. Calls engine.setSearch() on change.
 */
import { useState, useCallback } from 'react';
import engine from '../lib/stateEngine';
import { debounce } from '../lib/fuzzySearch';

const debouncedSearch = debounce((q) => engine.setSearch(q), 150);

export default function SearchBar() {
    const [value, setValue] = useState('');

    const onChange = useCallback((e) => {
        const q = e.target.value;
        setValue(q);
        debouncedSearch(q);
    }, []);

    const clear = useCallback(() => {
        setValue('');
        engine.setSearch('');
    }, []);

    return (
        <div className="search-wrap" role="search">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
                id="search-input"
                className="search-input"
                type="text"
                placeholder="Search project, company, partner, country..."
                value={value}
                onChange={onChange}
                aria-label="Fuzzy search across project fields"
                spellCheck={false}
                autoComplete="off"
            />
            {value && (
                <button
                    className="search-clear"
                    onClick={clear}
                    aria-label="Clear search"
                    title="Clear search"
                >
                    ×
                </button>
            )}
        </div>
    );
}
