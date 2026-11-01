import { useEffect, useRef } from 'react';
import { Terminal, Sliders } from 'lucide-react';

export default function TerminalPanel({
    viewMode,
    rightTab,
    setRightTab,
    execTime,
    terminalLogs,
    terminalCommand,
    setTerminalCommand,
    onCommandSubmit,
    stdinInput,
    setStdinInput,
}) {
    const terminalEndRef = useRef(null);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    const getLogClass = (type) => {
        if (type === 'cmd') return 'terminal-log-row terminal-log-cmd';
        if (type === 'stderr') return 'terminal-log-row terminal-log-stderr';
        if (type === 'meta') return 'terminal-log-row terminal-log-meta';
        if (type === 'system') return 'terminal-log-row terminal-log-system';
        return 'terminal-log-row terminal-log-stdout';
    };

    return (
        <aside
            className="terminal-card"
            style={{ width: viewMode === 'Terminal' ? '100%' : '390px' }}
            aria-label="Terminal and Standard Input Window"
        >
            <div className="terminal-header">
                <div className="mode-switcher" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={rightTab === 'terminal'}
                        className={`mode-btn ${rightTab === 'terminal' ? 'active' : ''}`}
                        onClick={() => setRightTab('terminal')}
                    >
                        <Terminal size={13} />
                        <span>Terminal</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={rightTab === 'stdin'}
                        className={`mode-btn ${rightTab === 'stdin' ? 'active' : ''}`}
                        onClick={() => setRightTab('stdin')}
                    >
                        <Sliders size={13} />
                        <span>Stdin</span>
                    </button>
                </div>
                {execTime !== null && <span className="badge badge-success">{execTime} ms</span>}
            </div>

            {rightTab === 'terminal' ? (
                <>
                    <div className="terminal-output">
                        {terminalLogs.map((log, i) => (
                            <div key={i} className={getLogClass(log.type)}>
                                {log.text}
                            </div>
                        ))}
                        <div ref={terminalEndRef} />
                    </div>

                    <form onSubmit={onCommandSubmit} className="terminal-input-row">
                        <span className="terminal-prompt-symbol" aria-hidden="true">
                            ❯
                        </span>
                        <input
                            className="terminal-input"
                            aria-label="Terminal command input"
                            placeholder="npm init -y, npm i lodash, ls, clear..."
                            value={terminalCommand}
                            onChange={(e) => setTerminalCommand(e.target.value)}
                        />
                    </form>
                </>
            ) : (
                <div
                    style={{
                        padding: 'var(--s-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--s-3)',
                        flex: 1,
                        background: 'var(--surface)',
                    }}
                >
                    <label htmlFor="stdin-textarea" style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-bold)' }}>
                        Custom <code>stdin</code> input piped directly into your program when you click{' '}
                        <strong>Run</strong>:
                    </label>
                    <textarea
                        id="stdin-textarea"
                        className="input"
                        style={{
                            flex: 1,
                            fontFamily: 'var(--font-code)',
                            fontSize: 'var(--fs-xs)',
                            resize: 'none',
                        }}
                        placeholder="Enter custom input lines here..."
                        value={stdinInput}
                        onChange={(e) => setStdinInput(e.target.value)}
                    />
                </div>
            )}
        </aside>
    );
}
