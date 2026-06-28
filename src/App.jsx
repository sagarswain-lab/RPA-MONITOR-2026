/**
 * App.jsx — Root application orchestrator
 *
 * Responsibilities:
 * 1. Initialize the RPA data stream (window.initializeRpaStream)
 * 2. Subscribe to engine events and propagate sort/filter/pause state to components
 * 3. Assemble the full layout: Header → KPIs → Controls → Filter → Grid
 * 4. Handle Inspector Panel (Bounty Task 1) open/close
 * 5. Manage layout persistence via LayoutManager
 *
 * Performance notes:
 * - viewUpdate fires every ~200ms. App re-renders with new `data` array.
 * - KPI counters bypass React state completely (DOM ref mutation in KPIBar).
 * - VirtualGrid uses forwardRef + RAF — no child re-mounts on data change.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import engine from './lib/stateEngine';

import KPIBar           from './components/KPIBar';
import VirtualGrid      from './components/VirtualGrid';
import FilterPanel      from './components/FilterPanel';
import SearchBar        from './components/SearchBar';
import PausePlayControl from './components/PausePlayControl';
import LayoutManager, { useLayout } from './components/LayoutManager';
import InspectorPanel   from './components/InspectorPanel';
import ExportButton     from './components/ExportButton';

export default function App() {
    // ── Layout visibility (Feature 6) ────────────────────────────────────────
    const { layout, toggle } = useLayout();

    // ── Stream data state ────────────────────────────────────────────────────
    const [data,    setData]    = useState([]);
    const [rowCount, setRowCount] = useState(0);

    // ── Sort state (passed to GridHeader for visual indicators) ──────────────
    const [sortPrimary,   setSortPrimary]   = useState(null);
    const [sortMulti,     setSortMulti]     = useState([]);
    const [useMultiSort,  setUseMultiSort]  = useState(false);

    // ── Pause state ──────────────────────────────────────────────────────────
    const [isPaused, setIsPaused] = useState(false);

    // ── Inspector (Bounty Task 1) ────────────────────────────────────────────
    const [inspectedRow, setInspectedRow] = useState(null);

    // ── Stream initialized flag ──────────────────────────────────────────────
    const [streamReady, setStreamReady] = useState(false);

    // ── Virtual grid ref ─────────────────────────────────────────────────────
    const gridRef = useRef(null);

    // ── Initialize telemetry stream ──────────────────────────────────────────
    useEffect(() => {
        if (typeof window !== 'undefined' && window.initializeRpaStream) {
            window.initializeRpaStream((batch) => {
                engine.process(batch);
            }, '/rpa_database_2026.csv');
            setStreamReady(true);
        } else {
            // Retry if script hasn't loaded yet
            const retry = setInterval(() => {
                if (window.initializeRpaStream) {
                    clearInterval(retry);
                    window.initializeRpaStream((batch) => {
                        engine.process(batch);
                    }, '/rpa_database_2026.csv');
                    setStreamReady(true);
                }
            }, 100);
            return () => clearInterval(retry);
        }
    }, []);

    // ── Subscribe to engine events ───────────────────────────────────────────
    useEffect(() => {
        // Data view updates — triggers grid re-render
        const unsubView = engine.on('viewUpdate', (arr) => {
            setData([...arr]);
            setRowCount(arr.length);
        });

        // Pause state changes
        const unsubPause = engine.on('pauseChange', (paused) => {
            setIsPaused(paused);
            // Close inspector when stream resumes
            if (!paused) setInspectedRow(null);
        });

        return () => {
            unsubView();
            unsubPause();
        };
    }, []);

    // ── Sort state sync from engine ───────────────────────────────────────────
    // We listen via engine's internal state (polled on each render that matters)
    // Sort events trigger a viewUpdate which triggers our setData above.
    // We sync visual sort indicators here via a thin wrapper.
    useEffect(() => {
        const unsub = engine.on('viewUpdate', () => {
            setSortPrimary(engine.sortPrimary  ? { ...engine.sortPrimary }  : null);
            setSortMulti(engine.sortMulti   ? [...engine.sortMulti]   : []);
            setUseMultiSort(engine.useMultiSort);
        });
        return () => unsub();
    }, []);

    // ── Inspector handler (Bounty Task 1) ────────────────────────────────────
    const handleRowClick = useCallback((row) => {
        if (engine.isPaused && row) {
            setInspectedRow(row);
        }
    }, []);

    const closeInspector = useCallback(() => {
        setInspectedRow(null);
    }, []);

    return (
        <div id="app-root">
            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <header className="app-header">
                <div className="app-header-logo">
                    <div className="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="6" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
                            <circle cx="16" cy="16" r="7" fill="none" stroke="#00e5ff" strokeWidth="1.5"/>
                            <circle cx="16" cy="16" r="3" fill="#00e5ff"/>
                            <line x1="16" y1="2" x2="16" y2="8" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
                            <line x1="16" y1="24" x2="16" y2="30" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
                            <line x1="2" y1="16" x2="8" y2="16" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
                            <line x1="24" y1="16" x2="30" y2="16" stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
                        </svg>
                    </div>
                    <div className="app-header-title">RPA MONITOR 2026</div>
                    <span className="header-badge">
                        {streamReady ? '⬡ LIVE' : '◌ INIT'}
                    </span>
                </div>

                <div className="header-spacer" />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        color: 'var(--text-3)',
                        letterSpacing: 1,
                    }}>
                        {rowCount.toLocaleString()} rows visible
                    </span>

                    <ExportButton />
                    <LayoutManager layout={layout} toggle={toggle} />
                </div>
            </header>

            {/* ── BODY ──────────────────────────────────────────────────────── */}
            <main className="app-body" role="main">

                {/* Feature 1: KPI Bar */}
                {layout.kpiBar && <KPIBar />}

                {/* Controls Row: Pause + Search */}
                <div className="controls-bar">
                    <PausePlayControl />

                    {layout.searchBar && <SearchBar />}
                </div>

                {/* Feature 7: Filter Panel */}
                {layout.filterPanel && <FilterPanel />}

                {/* Grid Panel */}
                <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div className="panel-header">
                        <div className="panel-dot" />
                        <div className="panel-title">
                            Telemetry Grid
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            color: 'var(--text-3)',
                            marginLeft: 8,
                            letterSpacing: 1,
                        }}>
                            {data.length.toLocaleString()} rows
                        </span>
                        {(sortPrimary || (useMultiSort && sortMulti.length > 0)) && (
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 9,
                                color: 'var(--violet)',
                                marginLeft: 8,
                                border: '1px solid var(--violet-dim)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--violet-dim)',
                            }}>
                                {useMultiSort
                                    ? `Multi-sort: ${sortMulti.length} col${sortMulti.length > 1 ? 's' : ''}`
                                    : `Sort: ${sortPrimary?.key} ${sortPrimary?.dir === 'asc' ? '↑' : '↓'}`}
                            </span>
                        )}
                        {isPaused && (
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 9,
                                color: 'var(--gold)',
                                marginLeft: 'auto',
                                letterSpacing: 1,
                                animation: 'pause-pulse 1.5s ease-in-out infinite',
                            }}>
                                ◉ PAUSED — Click any row to inspect
                            </span>
                        )}
                    </div>



                    {/* Feature 8: Virtual Grid */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <VirtualGrid
                            ref={gridRef}
                            data={data}
                            sortPrimary={sortPrimary}
                            sortMulti={sortMulti}
                            useMultiSort={useMultiSort}
                            isPaused={isPaused}
                            onRowClick={handleRowClick}
                        />

                        {/* Feature 5: Pause overlay — visual only, grid display locked for inspection */}
                        {isPaused && (
                            <div className="pause-overlay" aria-live="polite">
                                <div className="pause-banner">
                                    <span className="pause-dot" />
                                    <span className="pause-title">PAUSED</span>
                                    <span className="pause-sep">|</span>
                                    <span className="pause-sub">STREAM BUFFERING</span>
                                    <span className="pause-sep">|</span>
                                    <span className="pause-hint">⬡ Click any row to inspect details</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-3)',
                    letterSpacing: 1,
                }}>
                    <span>RPA MONITOR 2026 · Enterprise Control Terminal · Client-Side Only</span>
                    <span>⬡ {data.length.toLocaleString()} / 50K+ rows · 200ms stream · Custom virtualization</span>
                </div>
            </main>

            {/* ── BOUNTY TASK 1: Inspector Panel ─────────────────────────── */}
            {inspectedRow && (
                <InspectorPanel
                    row={inspectedRow}
                    onClose={closeInspector}
                />
            )}
        </div>
    );
}
