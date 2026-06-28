/**
 * FilterPanel.jsx — Feature 7: Categorical Dropdown Filters
 * Multi-select custom checkboxes for automation_type, department, industry.
 * Drives engine.setFilter() on selection change.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import engine from '../lib/stateEngine';

const FILTER_FIELDS = [
    { key: 'automation_type', label: 'Automation Type' },
    { key: 'department',      label: 'Department'      },
    { key: 'industry',        label: 'Industry'        },
];

function FilterDropdown({ fieldKey, label, options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleOption = (val) => {
        const next = new Set(selected);
        if (next.has(val)) next.delete(val);
        else next.add(val);
        onChange(fieldKey, [...next]);
    };

    const clearAll = (e) => {
        e.stopPropagation();
        onChange(fieldKey, []);
    };

    const selectedCount = selected.size;
    const displayText = selectedCount === 0
        ? 'All'
        : selectedCount === 1
            ? [...selected][0].slice(0, 14)
            : `${selectedCount} selected`;

    return (
        <div className="filter-group" ref={ref}>
            <div className="filter-label">{label}</div>
            <div className="filter-select-wrap">
                <button
                    id={`filter-btn-${fieldKey}`}
                    className={`filter-dropdown-btn${open ? ' open' : ''}`}
                    onClick={() => setOpen(o => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label={`Filter by ${label}`}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText}</span>
                    <span style={{ marginLeft: 6, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                    <div className="filter-dropdown-list" role="listbox" aria-multiselectable="true">
                        {selectedCount > 0 && (
                            <button className="filter-clear-btn" onClick={clearAll}>
                                Clear all
                            </button>
                        )}
                        {options.map(opt => {
                            const isSel = selected.has(opt);
                            return (
                                <div
                                    key={opt}
                                    className={`filter-option${isSel ? ' selected' : ''}`}
                                    onClick={() => toggleOption(opt)}
                                    role="option"
                                    aria-selected={isSel}
                                    title={opt}
                                >
                                    <span className="filter-checkbox">
                                        {isSel && (
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                <path d="M1 4l2 2 4-4" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                        )}
                                    </span>
                                    {opt}
                                </div>
                            );
                        })}
                        {options.length === 0 && (
                            <div style={{ padding: '8px', color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                                Loading...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FilterPanel() {
    const [options, setOptions]   = useState({ automation_type: [], department: [], industry: [] });
    const [selected, setSelected] = useState({
        automation_type: new Set(),
        department:      new Set(),
        industry:        new Set(),
    });

    // Populate options after initial data load
    useEffect(() => {
        const populate = () => {
            setOptions({
                automation_type: engine.getUniqueValues('automation_type'),
                department:      engine.getUniqueValues('department'),
                industry:        engine.getUniqueValues('industry'),
            });
        };
        // Try immediately
        populate();
        // Re-populate after first data flush (stream starts)
        const unsub = engine.on('viewUpdate', () => {
            if (engine.totalRows > 100) {
                populate();
                unsub();
            }
        });
        return () => unsub();
    }, []);

    const handleChange = useCallback((field, values) => {
        const next = new Set(values);
        setSelected(prev => ({ ...prev, [field]: next }));
        engine.setFilter(field, values);
    }, []);

    const clearAll = () => {
        setSelected({ automation_type: new Set(), department: new Set(), industry: new Set() });
        engine.clearAllFilters();
    };

    const totalActive = Object.values(selected).reduce((acc, s) => acc + s.size, 0);

    return (
        <div className="panel filter-panel">
            <div className="panel-header">
                <div className="panel-dot" />
                <div className="panel-title">Categorical Filters</div>
                {totalActive > 0 && (
                    <>
                        <span style={{
                            fontSize: 9, fontFamily: 'var(--font-mono)',
                            background: 'var(--violet-dim)', color: '#a78bfa',
                            padding: '2px 6px', borderRadius: 4,
                            border: '1px solid var(--violet)',
                        }}>
                            {totalActive} active
                        </span>
                        <button
                            className="filter-clear-btn"
                            onClick={clearAll}
                            style={{ marginLeft: 4 }}
                        >
                            Reset all
                        </button>
                    </>
                )}
            </div>
            <div className="filter-row">
                {FILTER_FIELDS.map(f => (
                    <FilterDropdown
                        key={f.key}
                        fieldKey={f.key}
                        label={f.label}
                        options={options[f.key]}
                        selected={selected[f.key]}
                        onChange={handleChange}
                    />
                ))}
            </div>
        </div>
    );
}
