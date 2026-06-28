/**
 * PausePlayControl.jsx — Feature 5: Pipeline Buffer Control
 * Pause = lock UI display, buffer incoming data in engine queue.
 * Play  = flush buffered data seamlessly.
 */
import { useState, useEffect } from 'react';
import engine from '../lib/stateEngine';

export default function PausePlayControl() {
    const [isPaused, setIsPaused]     = useState(engine.isPaused);
    const [queueSize, setQueueSize]   = useState(0);

    useEffect(() => {
        const unsubPause = engine.on('pauseChange', (paused) => setIsPaused(paused));
        const unsubQueue = engine.on('queueSize',   (n)      => setQueueSize(n));

        // Spacebar shortcut listener for Pause/Play toggle
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                const activeEl = document.activeElement;
                const isInput = activeEl && (
                    activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.isContentEditable
                );
                if (!isInput) {
                    e.preventDefault();
                    if (engine.isPaused) engine.play();
                    else engine.pause();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            unsubPause();
            unsubQueue();
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggle = () => {
        if (engine.isPaused) {
            engine.play();
        } else {
            engine.pause();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                id="pause-play-btn"
                className={`pause-btn${isPaused ? ' paused' : ''}`}
                onClick={toggle}
                aria-label={isPaused ? 'Resume stream' : 'Pause stream'}
                title={isPaused
                    ? `Resume — flush ${queueSize} buffered rows`
                    : 'Pause the live stream display'}
            >
                {isPaused ? (
                    <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2 1.5L10 6L2 10.5V1.5Z"/>
                        </svg>
                        RESUME
                    </>
                ) : (
                    <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <rect x="2" y="1" width="3" height="10" rx="1"/>
                            <rect x="7" y="1" width="3" height="10" rx="1"/>
                        </svg>
                        PAUSE
                    </>
                )}
            </button>

            {isPaused && queueSize > 0 && (
                <span className="queue-badge" aria-live="polite">
                    {queueSize.toLocaleString()} queued
                </span>
            )}

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: isPaused ? 'var(--gold)' : 'var(--emerald)',
                letterSpacing: 1,
                textTransform: 'uppercase',
            }}>
                {!isPaused && <span className="streaming-dot" />}
                {isPaused ? 'BUFFERING' : 'STREAMING'}
            </div>
        </div>
    );
}
