/**
 * StateEngine — Central telemetry data orchestrator
 * Manages the entire data pipeline: ingestion → filter → sort → view
 * Zero React dependency — pure JS singleton for maximum performance
 */
import { sortSingle, sortMulti } from './sorter';
import { tokenizeQuery, matchesSearch, buildSearchCache } from './fuzzySearch';

class StateEngine {
    constructor() {
        // Core data pool
        this._pool = new Map();       // internal_uid → row (O(1) upsert)
        this._sortedView = [];        // final filtered+sorted array for grid

        // KPI accumulators
        this._kpis = { rows: 0, robots: 0, savings: 0 };

        // Stream control
        this._isPaused = false;
        this._pauseQueue = [];        // batches buffered during pause

        // Sort state
        this._sortPrimary = null;     // { key, dir } — Feature 4
        this._sortMulti = [];         // [{ key, dir }] — Feature 9
        this._useMultiSort = false;

        // Filter state — Feature 7
        this._filters = {
            automation_type: new Set(),
            department: new Set(),
            industry: new Set(),
        };

        // Search — Feature 10
        this._searchQuery = '';

        // Alert tracking: uid → timestamp to auto-expire
        this._alertMap = new Map();

        // Event bus
        this._listeners = {};

        // Recompute debounce
        this._recomputeRaf = null;
    }

    // ─── Event bus ─────────────────────────────────────────────────────────────
    on(event, handler) {
        if (!this._listeners[event]) this._listeners[event] = new Set();
        this._listeners[event].add(handler);
        return () => this.off(event, handler);
    }
    off(event, handler) { this._listeners[event]?.delete(handler); }
    _emit(event, data) { this._listeners[event]?.forEach(h => h(data)); }

    // ─── Stream integration ─────────────────────────────────────────────────────
    /** Called by window.initializeRpaStream callback every 200ms */
    process(batch) {
        if (this._isPaused) {
            this._pauseQueue.push(...batch);
            this._emit('queueSize', this._pauseQueue.length);
            return;
        }
        this._ingest(batch);
    }

    _ingest(batch) {
        const now = Date.now();
        batch.forEach(rawRow => {
            // Numeric coercion (CSV strings → numbers)
            const row = { ...rawRow };
            row.roi_percent = parseFloat(row.roi_percent) || 0;
            row.budget_usd = parseFloat(row.budget_usd) || 0;
            row.annual_savings_usd = parseFloat(row.annual_savings_usd) || 0;
            row.robots_deployed = parseInt(row.robots_deployed, 10) || 0;
            // Inject ROI anomaly (~5% of rows) — Feature 3
            if (Math.random() > 0.95) {
                row.roi_percent = -parseFloat((Math.random() * 80 + 5).toFixed(2));
            }

            // Pre-build search cache for Feature 10 (Fuzzy Search)
            row._searchCache = buildSearchCache(row);

            const isNew = !this._pool.has(row.internal_uid);
            this._pool.set(row.internal_uid, row);

            // KPI counters
            this._kpis.rows++;
            if (isNew) {
                this._kpis.robots += row.robots_deployed;
                this._kpis.savings += row.annual_savings_usd;
            }

            // Alert tracking: Failed status or negative ROI
            const needsAlert = row.project_status === 'Failed' || row.roi_percent < 0;
            if (needsAlert) this._alertMap.set(row.internal_uid, now);
        });

        // Debounce recompute to RAF
        if (this._recomputeRaf) cancelAnimationFrame(this._recomputeRaf);
        this._recomputeRaf = requestAnimationFrame(() => {
            this._recompute();
            this._emit('kpiUpdate', { ...this._kpis });
        });
    }

    /** Flush buffered queue when resuming */
    flush() {
        const queued = this._pauseQueue.splice(0);
        if (queued.length) this._ingest(queued);
        this._emit('queueSize', 0);
    }

    // ─── Pause / Play ───────────────────────────────────────────────────────────
    pause() {
        this._isPaused = true;
        this._emit('pauseChange', true);
    }
    play() {
        this._isPaused = false;
        this._emit('pauseChange', false);
        this.flush();
    }

    // ─── Sort ───────────────────────────────────────────────────────────────────
    /** Feature 4: single column sort */
    setSortPrimary(key, dir) {
        this._sortPrimary = { key, dir };
        this._useMultiSort = false;
        this._recompute();
    }
    /** Feature 9: shift+click multi-column sort */
    addMultiSortKey(key, dir) {
        this._sortMulti = this._sortMulti.filter(s => s.key !== key);
        this._sortMulti.push({ key, dir });
        this._useMultiSort = true;
        this._recompute();
    }
    clearSort() {
        this._sortPrimary = null;
        this._sortMulti = [];
        this._useMultiSort = false;
        this._recompute();
    }

    // ─── Filters ────────────────────────────────────────────────────────────────
    /** Feature 7: categorical filter */
    setFilter(field, values) {
        this._filters[field] = new Set(values);
        this._recompute();
    }
    clearAllFilters() {
        Object.keys(this._filters).forEach(k => { this._filters[k] = new Set(); });
        this._recompute();
    }

    // ─── Search ─────────────────────────────────────────────────────────────────
    /** Feature 10: fuzzy multi-field search */
    setSearch(q) {
        this._searchQuery = q.toLowerCase().trim();
        this._recompute();
    }

    // ─── Recompute pipeline ─────────────────────────────────────────────────────
    _recompute() {
        let arr = Array.from(this._pool.values());

        // 1. Apply categorical filters
        const hasFilter = Object.values(this._filters).some(s => s.size > 0);
        if (hasFilter) {
            arr = arr.filter(row =>
                Object.entries(this._filters).every(([field, set]) =>
                    set.size === 0 || set.has(row[field])
                )
            );
        }

        // 2. Apply fuzzy search (tokenized partial match — Feature 10)
        if (this._searchQuery) {
            const tokens = tokenizeQuery(this._searchQuery);
            arr = arr.filter(row => matchesSearch(row, tokens));
        }

        // 3. Apply sort (Features 4 & 9)
        if (this._useMultiSort && this._sortMulti.length) {
            arr = sortMulti(arr, this._sortMulti);
        } else if (this._sortPrimary) {
            arr = sortSingle(arr, this._sortPrimary.key, this._sortPrimary.dir);
        }

        this._sortedView = arr;
        this._emit('viewUpdate', arr);
    }

    // ─── Getters ─────────────────────────────────────────────────────────────────
    get isPaused() { return this._isPaused; }
    get kpis() { return { ...this._kpis }; }
    get pauseQueueSize() { return this._pauseQueue.length; }
    get sortedView() { return this._sortedView; }
    get sortPrimary() { return this._sortPrimary; }
    get sortMulti() { return this._sortMulti; }
    get useMultiSort() { return this._useMultiSort; }
    get totalRows() { return this._pool.size; }

    isAlertRow(uid) {
        const ts = this._alertMap.get(uid);
        if (!ts) return false;
        // Auto-expire alerts after 1.5s
        if (Date.now() - ts > 1500) { this._alertMap.delete(uid); return false; }
        return true;
    }

    getUniqueValues(field) {
        const s = new Set();
        this._pool.forEach(r => { if (r[field]) s.add(r[field]); });
        return [...s].sort();
    }

    getRow(uid) { return this._pool.get(uid); }
}

const engine = new StateEngine();
export default engine;