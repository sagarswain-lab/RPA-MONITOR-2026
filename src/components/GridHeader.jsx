/**
 * GridHeader.jsx — Features 4 & 9: Single + Multi-Column Sort
 * Click = single sort. Shift+Click = add to multi-sort stack.
 */
import engine from '../lib/stateEngine';
import { SORTABLE_COLS, toggleSort } from '../lib/sorter';

const COLUMNS = [
    { key: 'idx',                    label: '#',          sortable: false, align: 'right' },
    { key: 'project_id',             label: 'Proj ID',    sortable: false },
    { key: 'project_name',           label: 'Project',    sortable: false },
    { key: 'budget_usd',             label: 'Budget',     sortable: true,  align: 'right' },
    { key: 'annual_savings_usd',     label: 'Savings',    sortable: false, align: 'right' },
    { key: 'roi_percent',            label: 'ROI %',      sortable: true,  align: 'right' },
    { key: 'project_status',         label: 'Status',     sortable: false },
    { key: 'automation_type',        label: 'Type',       sortable: false },
    { key: 'robots_deployed',        label: 'Robots',     sortable: false, align: 'right' },
    { key: 'employee_hours_saved',   label: 'Hrs Saved',  sortable: true,  align: 'right' },
    { key: 'ai_enabled',             label: 'AI',         sortable: false },
];

export default function GridHeader({ sortPrimary, sortMulti, useMultiSort }) {
    const handleClick = (key, e) => {
        if (!SORTABLE_COLS.includes(key)) return;

        if (e.shiftKey) {
            // Feature 9: multi-column sort
            const existing = sortMulti.find(s => s.key === key);
            const dir = existing ? (existing.dir === 'asc' ? 'desc' : 'asc') : 'asc';
            engine.addMultiSortKey(key, dir);
        } else {
            // Feature 4: single sort
            const next = toggleSort(sortPrimary, key);
            engine.setSortPrimary(next.key, next.dir);
        }
    };

    const getSortInfo = (key) => {
        if (useMultiSort) {
            const idx = sortMulti.findIndex(s => s.key === key);
            if (idx >= 0) return { active: true, dir: sortMulti[idx].dir, rank: idx + 1 };
        } else if (sortPrimary?.key === key) {
            return { active: true, dir: sortPrimary.dir, rank: null };
        }
        return { active: false };
    };

    return (
        <div className="grid-header" role="row" aria-label="Grid column headers">
            {COLUMNS.map(col => {
                const info = getSortInfo(col.key);
                return (
                    <div
                        key={col.key}
                        className={[
                            'grid-th',
                            col.sortable ? 'sortable' : '',
                            info.active ? 'sort-active' : '',
                            col.align === 'right' ? 'align-right' : '',
                        ].join(' ')}
                        onClick={(e) => col.sortable && handleClick(col.key, e)}
                        title={col.sortable ? 'Click to sort · Shift+Click for multi-sort' : col.label}
                        role={col.sortable ? 'columnheader button' : 'columnheader'}
                        aria-sort={info.active ? (info.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                        {col.label}
                        {col.sortable && (
                            <>
                                {info.active ? (
                                    <span className="sort-arrow">
                                        {info.dir === 'asc' ? '↑' : '↓'}
                                    </span>
                                ) : (
                                    <span className="sort-arrow" style={{ opacity: 0.3 }}>↕</span>
                                )}
                                {info.rank && (
                                    <span className="sort-badge">{info.rank}</span>
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
