/**
 * VirtualGrid.jsx — Feature 8 (15pts): High-Frequency Virtualized DOM Grid
 *
 * Architecture:
 * - Fixed ~25 DOM row nodes (never more, never less regardless of data size)
 * - One tall spacer div creates the real scrollbar (height = rows × ROW_HEIGHT)
 * - On scroll: compute startIdx from scrollTop, stamp data into existing nodes
 * - RAF-locked: requestAnimationFrame gates all visual updates
 * - Zero React re-renders during scroll — all DOM writes are imperative
 *
 * Feature 3: Alert flash via CSS class + animationend cleanup
 * Bounty Task 1: When paused, row click opens Inspector
 */
import {
    useRef, useEffect, useCallback, useImperativeHandle, forwardRef,
} from 'react';
import engine from '../lib/stateEngine';
import {
    formatCurrency, formatROI, formatInt, statusClass, roiColorClass,
} from '../lib/formatters';
import GridHeader from './GridHeader';

const ROW_HEIGHT   = 36;   // must match CSS --row-height
const OVERSCAN     = 4;    // extra rows above/below viewport

// ──────────────────────────────────────────────────────────────────────────────
// DOM-level row renderer — writes directly into pre-created row elements.
// This is the hot path: called on every scroll frame.
// ──────────────────────────────────────────────────────────────────────────────
function stampRow(rowEl, row, idx, isPaused) {
    if (!rowEl || !row) return;

    const uid  = row.internal_uid;
    const roi  = parseFloat(row.roi_percent) || 0;
    const prev = rowEl.dataset.uid;

    // Alert detection (Feature 3)
    const needsAlert = engine.isAlertRow(uid);
    if (needsAlert && prev !== uid) {
        rowEl.classList.add('row--alert');
    } else if (!needsAlert) {
        rowEl.classList.remove('row--alert');
    }

    rowEl.dataset.uid = uid;
    rowEl.dataset.idx = idx;

    // Position this row at the correct pixel offset
    rowEl.style.transform = `translateY(${idx * ROW_HEIGHT}px)`;
    rowEl.style.display   = 'grid';

    // Paused cursor hint (Bounty Task 1)
    if (isPaused) {
        rowEl.classList.add('paused-hover');
    } else {
        rowEl.classList.remove('paused-hover');
    }

    // ── Stamp each cell ──────────────────────────────────────────────────────
    const cells = rowEl.children;

    // [0] index
    cells[0].textContent = (idx + 1).toLocaleString();

    // [1] project_id
    cells[1].textContent = row.project_id || '';

    // [2] project_name (full)
    cells[2].textContent = row.project_name || '';
    cells[2].title       = row.project_name || '';

    // [3] budget_usd
    cells[3].textContent = formatCurrency(row.budget_usd);

    // [4] annual_savings_usd
    cells[4].textContent = formatCurrency(row.annual_savings_usd);

    // [5] roi_percent — color
    const roiFormatted = formatROI(roi);
    cells[5].textContent = roiFormatted;
    cells[5].className   = `grid-cell cell-num ${roiColorClass(roi)}`;

    // [6] status badge
    const stCls = statusClass(row.project_status);
    cells[6].innerHTML = `<span class="status-badge ${stCls}">${row.project_status || '—'}</span>`;

    // [7] automation_type
    cells[7].textContent = row.automation_type || '';

    // [8] robots_deployed
    cells[8].textContent = formatInt(row.robots_deployed);

    // [9] employee_hours_saved
    cells[9].textContent = formatInt(row.employee_hours_saved);

    // [10] ai_enabled
    const aiVal  = (row.ai_enabled || '').toLowerCase() === 'yes';
    cells[10].innerHTML = `<span class="tag ${aiVal ? 'tag-yes' : 'tag-no'}">${aiVal ? 'AI' : '—'}</span>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Create a single recycled DOM row element with fixed cell structure.
// ──────────────────────────────────────────────────────────────────────────────
function createRowEl(onRowClick) {
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.setAttribute('role', 'row');

    // Position rows absolutely so they DON'T contribute to scroll height.
    // translateY in stampRow controls their visual position.
    row.style.position = 'absolute';
    row.style.left     = '0';
    row.style.right    = '0';
    row.style.top      = '0';

    const cellDefs = [
        { cls: 'grid-cell cell-id cell-num' },    // 0 idx
        { cls: 'grid-cell cell-id' },              // 1 project_id
        { cls: 'grid-cell' },                      // 2 project_name
        { cls: 'grid-cell cell-num cell-currency' }, // 3 budget_usd
        { cls: 'grid-cell cell-num cell-currency' }, // 4 annual_savings_usd
        { cls: 'grid-cell cell-num' },             // 5 roi_percent
        { cls: 'grid-cell' },                      // 6 status
        { cls: 'grid-cell' },                      // 7 automation_type
        { cls: 'grid-cell cell-num' },             // 8 robots
        { cls: 'grid-cell cell-num' },             // 9 hours_saved
        { cls: 'grid-cell' },                      // 10 ai_enabled
    ];

    cellDefs.forEach(({ cls }) => {
        const cell = document.createElement('div');
        cell.className = cls;
        cell.setAttribute('role', 'cell');
        row.appendChild(cell);
    });

    // Handle animationend for alert flash (Feature 3)
    row.addEventListener('animationend', () => {
        row.classList.remove('row--alert');
    });

    // Row click (Bounty Task 1 + general)
    row.addEventListener('click', () => onRowClick(row.dataset.uid));

    return row;
}

// ──────────────────────────────────────────────────────────────────────────────
// VirtualGrid Component
// ──────────────────────────────────────────────────────────────────────────────
const VirtualGrid = forwardRef(function VirtualGrid({ data, sortPrimary, sortMulti, useMultiSort, isPaused, onRowClick }, ref) {
    const containerRef    = useRef(null); // scrollable container
    const rowsContainerRef = useRef(null); // absolutely positioned row nodes wrapper
    const spacerRef       = useRef(null); // full-height spacer for real scrollbar
    const domRowsRef      = useRef([]);   // recycled DOM row elements
    const rafRef          = useRef(null);
    const dataRef         = useRef(data); // latest data without re-render
    const isPausedRef     = useRef(isPaused);

    // Keep refs in sync
    useEffect(() => { dataRef.current   = data; },     [data]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    // ── Create recycled DOM rows on mount ─────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        const wrapper   = rowsContainerRef.current;
        if (!container || !wrapper) return;

        const containerH  = container.clientHeight || 600;
        const visibleCount = Math.ceil(containerH / ROW_HEIGHT) + OVERSCAN * 2;

        // Create exactly visibleCount row elements
        const rows = [];
        for (let i = 0; i < visibleCount; i++) {
            const el = createRowEl((uid) => {
                // Only trigger inspector when paused (Bounty Task 1)
                if (isPausedRef.current && onRowClick) {
                    const row = engine.getRow(uid);
                    if (row) onRowClick(row);
                }
            });
            wrapper.appendChild(el);
            rows.push(el);
        }
        domRowsRef.current = rows;

        return () => {
            rows.forEach(el => el.remove());
            domRowsRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Core render function — hot path ───────────────────────────────────────
    const render = useCallback(() => {
        const container = containerRef.current;
        const spacer    = spacerRef.current;
        const domRows   = domRowsRef.current;
        const arr       = dataRef.current;

        if (!container || !spacer || !domRows.length) return;

        const total      = arr.length;
        const scrollTop  = container.scrollTop;
        const visCount   = domRows.length;

        // Update spacer height for real scrollbar (header height NOT included — header is sticky in flow)
        spacer.style.height = `${total * ROW_HEIGHT}px`;

        if (total === 0) {
            domRows.forEach(el => {
                el.style.display = 'none';
                el.style.transform = 'translateY(0)';
            });
            return;
        }

        // Compute visible window — which data indices should be in DOM
        const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIdx   = Math.min(total - 1, startIdx + visCount - 1);

        const isPaused = isPausedRef.current;

        // Stamp each recycled DOM row with fresh data + correct translateY position
        for (let i = 0; i < visCount; i++) {
            const dataIdx = startIdx + i;
            const rowEl   = domRows[i];
            if (dataIdx <= endIdx && dataIdx < total) {
                stampRow(rowEl, arr[dataIdx], dataIdx, isPaused);
            } else {
                rowEl.style.display   = 'none';
                rowEl.style.transform = 'translateY(0)';
            }
        }
    }, []);

    // ── Scroll handler — RAF gated ────────────────────────────────────────────
    const onScroll = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
    }, [render]);

    // ── Re-render when data changes ───────────────────────────────────────────
    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
    }, [data, render]);

    // ── Cleanup RAF on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    // Expose render method for parent (e.g., after pause/play flush)
    useImperativeHandle(ref, () => ({ render }), [render]);

    const total = data.length;

    return (
        <div
            className="grid-outer"
            style={{ height: 600, position: 'relative', overflow: 'hidden' }}
        >
            {/* Scroll container — creates real scrollbar via inner spacer */}
            <div
                ref={containerRef}
                className="grid-scroll-container"
                onScroll={onScroll}
                role="grid"
                aria-label={`Telemetry data grid, ${total} rows`}
                aria-rowcount={total}
                tabIndex={0}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'scroll',
                    overflowX: 'hidden',
                }}
            >
                {/* Render GridHeader inside scroll container so it gets the exact same width and scrollbar margin */}
                <GridHeader
                    sortPrimary={sortPrimary}
                    sortMulti={sortMulti}
                    useMultiSort={useMultiSort}
                />

                {/* True full-height spacer — creates real browser scrollbar */}
                <div
                    ref={spacerRef}
                    aria-hidden="true"
                    style={{ height: total * ROW_HEIGHT, width: 1, pointerEvents: 'none' }}
                />

                {/* Recycled DOM rows — absolutely positioned inside scroll container.
                   The rowsContainer itself has height:0 so it adds zero scroll height.
                   Each row is position:absolute at translateY(dataIdx * ROW_HEIGHT) */}
                <div
                    ref={rowsContainerRef}
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        top: 'var(--header-height)',
                        left: 0,
                        right: 0,
                        height: 0,          // Critical: prevents rows from adding to scrollHeight
                        overflow: 'visible',
                        pointerEvents: 'none',
                    }}
                />
            </div>

            {/* Empty state */}
            {total === 0 && (
                <div className="grid-empty" aria-live="polite">
                    <div className="grid-empty-icon">⬡</div>
                    <div>No telemetry data — initializing stream...</div>
                </div>
            )}
        </div>
    );
});

export default VirtualGrid;
