/**
 * KPIBar.jsx — Feature 1: High-Density KPIs Dashboard
 * KPI counters update via direct DOM ref mutation (textContent).
 * Zero React re-renders. Subscribes to engine 'kpiUpdate' event.
 */
import { useEffect, useRef } from 'react';
import engine from '../lib/stateEngine';
import { formatKPI, formatRobots, formatRows } from '../lib/formatters';

export default function KPIBar() {
    const rowsRef    = useRef(null);
    const robotsRef  = useRef(null);
    const savingsRef = useRef(null);

    useEffect(() => {
        const update = ({ rows, robots, savings }) => {
            if (rowsRef.current)    rowsRef.current.textContent    = formatRows(rows);
            if (robotsRef.current)  robotsRef.current.textContent  = formatRobots(robots);
            if (savingsRef.current) savingsRef.current.textContent = formatKPI(savings);
        };

        const unsub = engine.on('kpiUpdate', update);
        // Sync initial values
        const k = engine.kpis;
        update(k);
        return () => unsub();
    }, []);

    return (
        <div className="kpi-bar" role="region" aria-label="Key Performance Indicators">
            <div className="kpi-card" id="kpi-rows">
                <div className="kpi-card__glow" />
                <div className="kpi-label">Total Rows Processed</div>
                <div className="kpi-value" ref={rowsRef}>0</div>
                <div className="kpi-sub">↑ 200ms stream tick</div>
            </div>

            <div className="kpi-card" id="kpi-robots">
                <div className="kpi-card__glow" />
                <div className="kpi-label">Active Robots Deployed</div>
                <div className="kpi-value" ref={robotsRef}>0</div>
                <div className="kpi-sub">∑ Cumulative count</div>
            </div>

            <div className="kpi-card" id="kpi-savings">
                <div className="kpi-card__glow" />
                <div className="kpi-label">Global Cumulative Savings</div>
                <div className="kpi-value" ref={savingsRef}>$0</div>
                <div className="kpi-sub">∑ annual_savings_usd</div>
            </div>
        </div>
    );
}
