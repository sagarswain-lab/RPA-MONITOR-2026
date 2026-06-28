/**
 * ExportButton.jsx — Bounty Task 3: Snapshot Export UI
 *
 * - Click or Ctrl+Shift+E triggers CSV export of the current filtered+sorted view
 * - Shows animated loading state while export is being compiled
 * - Shows toast confirmation with row count + filename
 * - Reads directly from engine.sortedView (respects all filters + multi-sort)
 */
import { useState, useEffect, useCallback } from 'react';
import engine from '../lib/stateEngine';
import { exportSnapshot } from '../lib/csvExporter';

const TOAST_MS = 3500; // how long the success toast stays visible

export default function ExportButton() {
    const [state, setState] = useState('idle'); // 'idle' | 'exporting' | 'done' | 'error'
    const [lastInfo, setLastInfo] = useState(null); // { rows, filename }

    const handleExport = useCallback(() => {
        if (state === 'exporting') return;

        // Snapshot the current view at this exact moment
        const snapshot = [...engine.sortedView];

        exportSnapshot(snapshot, {
            onStart: () => setState('exporting'),
            onDone: (rows, filename) => {
                setLastInfo({ rows, filename });
                setState('done');
                setTimeout(() => setState('idle'), TOAST_MS);
            },
            onError: () => {
                setState('error');
                setTimeout(() => setState('idle'), 2000);
            },
        });
    }, [state]);

    // Global keyboard shortcut: Ctrl+Shift+E
    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
                e.preventDefault();
                handleExport();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [handleExport]);

    return (
        <div className="export-wrap">
            <button
                id="export-snapshot-btn"
                className={`export-btn export-btn--${state}`}
                onClick={handleExport}
                disabled={state === 'exporting'}
                title="Export snapshot — Ctrl+Shift+E"
                aria-label="Export current filtered view as CSV"
                aria-live="polite"
            >
                {state === 'exporting' && (
                    <>
                        <span className="export-spinner" aria-hidden="true" />
                        <span>Compiling...</span>
                    </>
                )}
                {state === 'done' && (
                    <>
                        <span className="export-icon" aria-hidden="true">✓</span>
                        <span>{lastInfo?.rows?.toLocaleString()} rows exported</span>
                    </>
                )}
                {state === 'error' && (
                    <>
                        <span className="export-icon" aria-hidden="true">✗</span>
                        <span>Export failed</span>
                    </>
                )}
                {state === 'idle' && (
                    <>
                        <span className="export-icon" aria-hidden="true">↓</span>
                        <span>Export CSV</span>
                    </>
                )}
            </button>

            {/* Success toast with filename */}
            {state === 'done' && lastInfo && (
                <div className="export-toast" role="status" aria-live="polite">
                    <span className="export-toast-icon">⬡</span>
                    <span className="export-toast-text">
                        <strong>{lastInfo.rows.toLocaleString()} rows</strong> · {lastInfo.filename}
                    </span>
                </div>
            )}
        </div>
    );
}
