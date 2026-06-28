/**
 * csvExporter.js — Bounty Task 3: Snapshot Export
 *
 * Generates a downloadable CSV from the active filtered+sorted data view.
 * - Non-blocking: uses requestIdleCallback so stream continues uninterrupted
 * - Client-side only: Blob → URL.createObjectURL → anchor click
 * - UTF-8 BOM prefix for correct Excel rendering of unicode chars
 */

const CSV_COLUMNS = [
    { header: '#',                     field: null              }, // computed row number
    { header: 'Project ID',            field: 'project_id'      },
    { header: 'Project Name',          field: 'project_name'    },
    { header: 'Budget (USD)',           field: 'budget_usd'      },
    { header: 'Annual Savings (USD)',   field: 'annual_savings_usd' },
    { header: 'ROI (%)',               field: 'roi_percent'     },
    { header: 'Status',                field: 'project_status'  },
    { header: 'Automation Type',       field: 'automation_type' },
    { header: 'Department',            field: 'department'      },
    { header: 'Industry',              field: 'industry'        },
    { header: 'Robots Deployed',       field: 'robots_deployed' },
    { header: 'Employee Hours Saved',  field: 'employee_hours_saved' },
    { header: 'AI Enabled',            field: 'ai_enabled'      },
    { header: 'Country',               field: 'country'         },
    { header: 'Implementation Partner', field: 'implementation_partner' },
];

/** Escapes a single CSV cell value per RFC 4180 */
function escapeCell(val) {
    if (val == null) return '';
    const str = String(val);
    // Wrap in quotes if value contains comma, quote, newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Builds CSV string from data array.
 * Uses array-of-arrays + join() — significantly faster than string concatenation.
 * @param {Array} data - The current filtered+sorted view from engine.sortedView
 * @returns {string} CSV content
 */
function buildCsv(data) {
    const lines = new Array(data.length + 1);

    // Header row
    lines[0] = CSV_COLUMNS.map(c => c.header).join(',');

    // Data rows
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cells = CSV_COLUMNS.map((col, colIdx) => {
            if (col.field === null) return i + 1; // row number
            return escapeCell(row[col.field]);
        });
        lines[i + 1] = cells.join(',');
    }

    return lines.join('\r\n');
}

/**
 * Triggers a CSV download of the current data snapshot.
 * Non-blocking: defers heavy work via requestIdleCallback / setTimeout.
 *
 * @param {Array}    data      - Filtered+sorted data array (snapshot of engine.sortedView)
 * @param {Function} onStart   - Called when export begins (for loading state)
 * @param {Function} onDone    - Called when download is triggered (row count passed)
 * @param {Function} onError   - Called if something goes wrong
 */
export function exportSnapshot(data, { onStart, onDone, onError } = {}) {
    onStart?.();

    const doExport = () => {
        try {
            const ts = new Date()
                .toISOString()
                .replace('T', '_')
                .replace(/:/g, '-')
                .slice(0, 19);
            const filename = `rpa-snapshot_${ts}.csv`;

            const csv     = buildCsv(data);
            const bom     = '\uFEFF'; // UTF-8 BOM for Excel compat
            const blob    = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
            const url     = URL.createObjectURL(blob);

            // Programmatic anchor click — only way to set a filename on download
            const link     = document.createElement('a');
            link.href      = url;
            link.download  = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Revoke object URL after a tick so download has time to start
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            onDone?.(data.length, filename);
        } catch (err) {
            console.error('[csvExporter] Export failed:', err);
            onError?.(err);
        }
    };

    // Use requestIdleCallback if available (Chrome/Edge) — yields to browser first
    // Falls back to setTimeout(0) for Firefox/Safari
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(doExport, { timeout: 3000 });
    } else {
        setTimeout(doExport, 0);
    }
}
