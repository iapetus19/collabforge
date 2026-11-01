import { useState } from 'react';
import { ChevronsUpDown, GitBranch, Check, Copy, Save, Play } from 'lucide-react';
import { LANGUAGES } from '../../constants/workspaceConfig';

export default function StudioTopbar({
    user,
    activeRoom,
    viewMode,
    setViewMode,
    language,
    onLanguageChange,
    onLeaveRoom,
    onSave,
    saving,
    onRun,
    running,
}) {
    const [copied, setCopied] = useState(false);

    return (
        <header className="studio-topbar">
            <div className="crumb-group">
                <button
                    type="button"
                    className="logo-tile"
                    title="Back to All Workspaces"
                    aria-label="Back to All Workspaces"
                    onClick={onLeaveRoom}
                >
                    ◆
                </button>

                <span className="crumb-slash">/</span>

                <button type="button" className="studio-badge" onClick={onLeaveRoom}>
                    <div className="studio-avatar">
                        {user.username?.slice(0, 2).toUpperCase() || 'CF'}
                    </div>
                    <div className="studio-meta" style={{ textAlign: 'left' }}>
                        <span className="studio-title">{user.username} Studio</span>
                        <span className="studio-sub">{user.email}</span>
                    </div>
                    <ChevronsUpDown size={14} />
                </button>

                <span className="crumb-slash">/</span>

                <div className="project-branch-pill">
                    <GitBranch size={14} />
                    <span>{activeRoom.name}</span>
                </div>

                <div className="status-chip" title="WebSocket Sync Connected">
                    <span className="status-dot" />
                    <span>Connected</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                <div className="mode-switcher" role="group" aria-label="View Mode">
                    {['Code', 'Split', 'Terminal'].map((m) => (
                        <button
                            type="button"
                            key={m}
                            className={`mode-btn ${viewMode === m ? 'active' : ''}`}
                            onClick={() => setViewMode(m)}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <select
                    className="input"
                    aria-label="Select runtime language"
                    style={{ width: 'auto' }}
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                >
                    {LANGUAGES.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.label}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                        navigator.clipboard.writeText(activeRoom.roomId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    }}
                    title="Copy Room ID for Collaborators"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : activeRoom.roomId}</span>
                </button>

                <button type="button" className="btn btn-secondary" onClick={onSave} disabled={saving}>
                    <Save size={14} />
                    <span>{saving ? 'Syncing' : 'Save'}</span>
                </button>

                <button type="button" className="btn btn-run" onClick={onRun} disabled={running}>
                    <Play size={14} fill="currentColor" />
                    <span>{running ? 'Running...' : 'Run'}</span>
                </button>
            </div>
        </header>
    );
}
