import { useState } from 'react';
import { ChevronsUpDown, GitBranch, Check, Copy, Save, Play } from 'lucide-react';
import { LANGUAGES } from '../../constants/workspaceConfig';

const AVATAR_FILLS = [
    'var(--accent)',
    'var(--surface-alt)',
    'var(--success)',
    'var(--danger)',
    'var(--surface-muted)',
];

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
    participants = [],
}) {
    const [copied, setCopied] = useState(false);

    return (
        <header className="studio-topbar" role="banner">
            {/* Left: Room Name + Shareable Code Chip + Connection Pill */}
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

                <span className="crumb-slash" aria-hidden="true">
                    /
                </span>

                <button type="button" className="studio-badge" onClick={onLeaveRoom}>
                    <div className="studio-avatar" aria-hidden="true">
                        {user.username?.slice(0, 2).toUpperCase() || 'CF'}
                    </div>
                    <div className="studio-meta" style={{ textAlign: 'left' }}>
                        <span className="studio-title">{activeRoom.name}</span>
                        <span className="studio-sub">{user.username} Studio</span>
                    </div>
                    <ChevronsUpDown size={14} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                        navigator.clipboard.writeText(activeRoom.roomId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    }}
                    title="Copy Room Code for Collaborators"
                    aria-label="Copy Room Code"
                >
                    <GitBranch size={13} aria-hidden="true" />
                    <code>{activeRoom.roomId}</code>
                    {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                    {copied && <span>Copied</span>}
                </button>

                <div className="status-chip" role="status" aria-live="polite">
                    <span className="status-dot" aria-hidden="true" />
                    <span>Connected</span>
                </div>
            </div>

            {/* Center: Segmented View Toggle (Code / Split / Terminal) */}
            <div className="mode-switcher" role="group" aria-label="Workspace View Mode">
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

            {/* Right: Presence Avatars + Quiet Language Select + Save + Primary Run */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-1)' }}
                    aria-label={`Active collaborators (${participants.length})`}
                >
                    {participants.map((p, idx) => (
                        <div
                            key={p.socketId || p.id || idx}
                            className="studio-avatar"
                            style={{
                                background: AVATAR_FILLS[idx % AVATAR_FILLS.length],
                            }}
                            title={`${p.username}${String(p.id) === String(user.id || user._id) ? ' (You)' : ''} — Connected`}
                        >
                            {p.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
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

                <button type="button" className="btn btn-secondary" onClick={onSave} disabled={saving}>
                    <Save size={14} aria-hidden="true" />
                    <span>{saving ? 'Syncing' : 'Save'}</span>
                </button>

                <button type="button" className="btn btn-run" onClick={onRun} disabled={running}>
                    <Play size={14} fill="currentColor" aria-hidden="true" />
                    <span>{running ? 'Running...' : 'Run'}</span>
                </button>
            </div>
        </header>
    );
}
