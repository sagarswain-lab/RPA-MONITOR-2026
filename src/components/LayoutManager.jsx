/**
 * LayoutManager.jsx — Feature 6: Operator Workspace Layout Persistence
 * Show/hide panels. Persist in localStorage. Restore on hard refresh.
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rpa_layout_v1';

const DEFAULT_LAYOUT = {
    kpiBar:      true,
    filterPanel: true,
    searchBar:   true,
};

const PANEL_LABELS = {
    kpiBar:      'KPI Bar',
    filterPanel: 'Filters',
    searchBar:   'Search',
};

export function useLayout() {
    const [layout, setLayout] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults in case new keys added
                return { ...DEFAULT_LAYOUT, ...parsed };
            }
        } catch {
            /* ignore */
        }
        return DEFAULT_LAYOUT;
    });

    const toggle = useCallback((key) => {
        setLayout(prev => {
            const next = { ...prev, [key]: !prev[key] };
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    return { layout, toggle };
}

export default function LayoutManager({ layout, toggle }) {
    return (
        <div className="layout-toggles" role="toolbar" aria-label="Panel visibility toggles">
            {Object.keys(PANEL_LABELS).map(key => (
                <button
                    key={key}
                    id={`toggle-${key}`}
                    className={`toggle-btn${layout[key] ? ' active' : ''}`}
                    onClick={() => toggle(key)}
                    aria-pressed={layout[key]}
                    title={`${layout[key] ? 'Hide' : 'Show'} ${PANEL_LABELS[key]}`}
                >
                    <span>{layout[key] ? '◉' : '○'}</span>
                    {PANEL_LABELS[key]}
                </button>
            ))}
        </div>
    );
}
