/**
 * InspectorPanel.jsx — Bounty Task 1 (+8pts)
 * Opens when PAUSED and user clicks a grid row.
 * Displays ALL 18 fields beautifully.
 */
import { useEffect } from 'react';
import {
    formatCurrency,
    formatROI,
    formatInt,
    statusClass,
    roiColorClass,
} from '../lib/formatters';

const FIELD_GROUPS = [
    {
        title: 'Project Identity',
        fields: [
            { key: 'project_id',           label: 'Project ID' },
            { key: 'project_name',          label: 'Project Name' },
            { key: 'company_id',            label: 'Company ID' },
            { key: 'implementation_partner',label: 'Implementation Partner' },
        ],
    },
    {
        title: 'Financial Metrics',
        fields: [
            { key: 'budget_usd',        label: 'Budget',         fmt: formatCurrency,            highlight: 'highlight-gold' },
            { key: 'annual_savings_usd', label: 'Annual Savings', fmt: formatCurrency,            highlight: 'highlight-emerald' },
            { key: 'roi_percent',        label: 'ROI %',          fmt: (v) => formatROI(v),       highlight: null },
        ],
    },
    {
        title: 'Operational Details',
        fields: [
            { key: 'automation_type',      label: 'Automation Type' },
            { key: 'robots_deployed',      label: 'Robots Deployed',     fmt: formatInt, highlight: 'highlight-cyan' },
            { key: 'employee_hours_saved', label: 'Employee Hours Saved', fmt: (v) => `${formatInt(v)} hrs` },
        ],
    },
    {
        title: 'Classification',
        fields: [
            { key: 'department',  label: 'Department' },
            { key: 'industry',    label: 'Industry' },
            { key: 'country',     label: 'Country' },
        ],
    },
    {
        title: 'Infrastructure',
        fields: [
            { key: 'ai_enabled',       label: 'AI Enabled' },
            { key: 'cloud_deployment', label: 'Cloud Deployment' },
        ],
    },
];

function FieldCard({ label, value, highlight }) {
    return (
        <div className="inspector-field">
            <div className="inspector-field-label">{label}</div>
            <div className={`inspector-field-value ${highlight || ''}`}>
                {value !== undefined && value !== null && value !== ''
                    ? String(value)
                    : <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>—</span>}
            </div>
        </div>
    );
}

function YesNoBadge({ val }) {
    const isYes = String(val).toLowerCase() === 'yes';
    return (
        <span className={`tag ${isYes ? 'tag-yes' : 'tag-no'}`}>
            {isYes ? '✓ Yes' : '✗ No'}
        </span>
    );
}

export default function InspectorPanel({ row, onClose }) {
    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!row) return null;

    const roi     = parseFloat(row.roi_percent) || 0;
    const roiCls  = roiColorClass(roi);
    const statCls = statusClass(row.project_status);

    const hasStart      = !!row.start_date;
    const hasCompletion = !!row.completion_date;
    const statusLow     = (row.project_status || '').toLowerCase();

    return (
        <div
            className="inspector-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={`Project inspector: ${row.project_name}`}
        >
            <div className="inspector-panel">
                {/* ── Header ── */}
                <div className="inspector-header">
                    <div className="inspector-title-block">
                        <div className="inspector-project-id">
                            ⬡ {row.project_id || 'UNKNOWN'} &nbsp;·&nbsp;
                            <span className={`status-badge ${statCls}`}>
                                {row.project_status || 'Unknown'}
                            </span>
                        </div>
                        <div className="inspector-project-name">
                            {row.project_name || 'Unnamed Project'}
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                                {row.company_id}
                            </span>
                            {row.country && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>
                                    📍 {row.country}
                                </span>
                            )}
                            <span className={`inspector-field-value ${roiCls}`}
                                style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                ROI: {formatROI(roi)}
                            </span>
                        </div>
                    </div>

                    <button
                        className="inspector-close"
                        onClick={onClose}
                        aria-label="Close inspector"
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="inspector-body">
                    {/* Financial Highlight Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div className="inspector-field" style={{ borderColor: 'var(--gold-dim)' }}>
                            <div className="inspector-field-label">Budget</div>
                            <div className="inspector-field-value highlight-gold" style={{ fontSize: 18 }}>
                                {formatCurrency(row.budget_usd)}
                            </div>
                        </div>
                        <div className="inspector-field" style={{ borderColor: 'var(--emerald-dim)' }}>
                            <div className="inspector-field-label">Annual Savings</div>
                            <div className="inspector-field-value highlight-emerald" style={{ fontSize: 18 }}>
                                {formatCurrency(row.annual_savings_usd)}
                            </div>
                        </div>
                        <div className="inspector-field" style={{ borderColor: roi < 0 ? 'var(--danger-dim)' : 'var(--cyan-dim)' }}>
                            <div className="inspector-field-label">ROI Percent</div>
                            <div className={`inspector-field-value ${roiCls}`} style={{ fontSize: 18, fontWeight: 700 }}>
                                {formatROI(roi)}
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="inspector-timeline" style={{ marginBottom: 20 }}>
                        <div className="inspector-timeline-title">Project Timeline</div>
                        <div className="timeline-track">
                            <div className="timeline-node">
                                <div className={`timeline-dot${hasStart ? '' : ' empty'}`} />
                                <div className="timeline-label">
                                    {hasStart ? row.start_date : 'No Start'}
                                    <br /><span style={{ color: 'var(--text-3)' }}>Start</span>
                                </div>
                            </div>
                            <div className="timeline-line" />
                            <div className="timeline-node">
                                <div className={`timeline-dot${hasCompletion ? ' done' : ' empty'}`} />
                                <div className="timeline-label">
                                    {hasCompletion ? row.completion_date : 'In Progress'}
                                    <br /><span style={{ color: 'var(--text-3)' }}>Completion</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* All Fields Grid */}
                    {FIELD_GROUPS.map(group => (
                        <div key={group.title} style={{ marginBottom: 16 }}>
                            <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 8,
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                color: 'var(--cyan)',
                                marginBottom: 8,
                                paddingBottom: 4,
                                borderBottom: '1px solid var(--card-border)',
                            }}>
                                {group.title}
                            </div>
                            <div className="inspector-grid">
                                {group.fields.map(f => {
                                    // Special rendering
                                    if (f.key === 'ai_enabled' || f.key === 'cloud_deployment') {
                                        return (
                                            <div className="inspector-field" key={f.key}>
                                                <div className="inspector-field-label">{f.label}</div>
                                                <div className="inspector-field-value">
                                                    <YesNoBadge val={row[f.key]} />
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (f.key === 'project_status') {
                                        return (
                                            <div className="inspector-field" key={f.key}>
                                                <div className="inspector-field-label">{f.label}</div>
                                                <div className="inspector-field-value">
                                                    <span className={`status-badge ${statCls}`}>{row[f.key]}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const raw = row[f.key];
                                    const disp = f.fmt ? f.fmt(raw) : raw;
                                    // ROI highlight override
                                    let cls = f.highlight;
                                    if (f.key === 'roi_percent') cls = roiCls;
                                    return (
                                        <FieldCard key={f.key} label={f.label} value={disp} highlight={cls} />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Robots metric */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        <div className="inspector-field" style={{ borderColor: 'var(--cyan-dim)' }}>
                            <div className="inspector-field-label">Robots Deployed</div>
                            <div className="inspector-field-value highlight-cyan" style={{ fontSize: 22, fontWeight: 700 }}>
                                {formatInt(row.robots_deployed)}
                                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>units</span>
                            </div>
                        </div>
                        <div className="inspector-field">
                            <div className="inspector-field-label">Employee Hours Saved</div>
                            <div className="inspector-field-value" style={{ fontSize: 22, fontWeight: 700 }}>
                                {formatInt(row.employee_hours_saved)}
                                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>hrs</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        marginTop: 20,
                        paddingTop: 12,
                        borderTop: '1px solid var(--card-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: 1 }}>
                            UID: {row.internal_uid}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)' }}>
                            Press ESC to close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
