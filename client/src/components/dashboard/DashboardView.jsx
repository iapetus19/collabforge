import { useState, useRef } from 'react';
import { Plus, LogIn, LogOut, GitBranch, FolderGit2, Clock, ArrowRight } from 'lucide-react';
import { LANGUAGES, getStarterFiles } from '../../constants/workspaceConfig';
import { apiRequest } from '../../api';

function formatLastActive(room) {
    const rawDate = room?.updatedAt || room?.createdAt;
    if (!rawDate) return 'Active recently';
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return 'Active recently';
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function DashboardView({ user, rooms, onEnterRoom, onLogout }) {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomLang, setNewRoomLang] = useState('javascript');
    const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [createError, setCreateError] = useState('');
    const [joinError, setJoinError] = useState('');

    const createNameInputRef = useRef(null);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        setCreateError('');
        setCreating(true);
        try {
            const starter = getStarterFiles(newRoomLang);
            const data = await apiRequest('/api/rooms', {
                method: 'POST',
                body: JSON.stringify({
                    name: newRoomName,
                    language: newRoomLang,
                    files: starter,
                }),
            });
            setNewRoomName('');
            onEnterRoom({ ...data.room, files: data.room.files?.length ? data.room.files : starter });
        } catch (err) {
            setCreateError(err.message || 'Failed to create room.');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinByCode = async (e) => {
        e.preventDefault();
        if (!joinRoomIdInput.trim()) return;
        setJoinError('');
        setJoining(true);
        try {
            const data = await apiRequest(`/api/rooms/${joinRoomIdInput.trim()}`);
            onEnterRoom(data.room);
        } catch (err) {
            setJoinError(err.message || 'Room not found or unavailable.');
        } finally {
            setJoining(false);
        }
    };

    return (
        <div className="dashboard-shell">
            <header className="studio-topbar dashboard-topbar" role="banner">
                <div className="crumb-group">
                    <div className="logo-tile" aria-hidden="true">
                        ◆
                    </div>
                    <span className="crumb-slash" aria-hidden="true">
                        /
                    </span>
                    <div className="studio-badge" aria-label="Current user profile">
                        <div className="studio-avatar" aria-hidden="true">
                            {user.username?.slice(0, 2).toUpperCase() || 'CF'}
                        </div>
                        <div className="studio-meta">
                            <span className="studio-title">{user.username} Studio</span>
                            <span className="studio-sub">{user.email}</span>
                        </div>
                    </div>
                    <span className="badge badge-success">Online</span>
                </div>

                <button type="button" className="btn btn-secondary" onClick={onLogout}>
                    <LogOut size={14} aria-hidden="true" />
                    <span>Sign out</span>
                </button>
            </header>

            <main className="dashboard-container" role="main">
                {/* Top Action Windows: Primary Create Room + Secondary Join with Code */}
                <section className="dashboard-actions-grid" aria-label="Workspace Actions">
                    {/* Primary Action Window: Create Room */}
                    <div className="window">
                        <div className="window-header">
                            <span className="window-title">
                                <Plus size={15} aria-hidden="true" />
                                <span>Create room</span>
                            </span>
                            <span className="badge badge-accent">Host</span>
                        </div>

                        <div className="window-body">
                            <p className="dashboard-panel-desc">
                                Initialize a new multi-file project workspace and invite collaborators by code.
                            </p>

                            {createError && (
                                <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-3)' }}>
                                    {createError}
                                </div>
                            )}

                            <form onSubmit={handleCreateRoom}>
                                <div className="form-group">
                                    <label htmlFor="create-room-name">Room Name</label>
                                    <input
                                        ref={createNameInputRef}
                                        id="create-room-name"
                                        className="input"
                                        type="text"
                                        placeholder="e.g. Distributed-Systems-Lab"
                                        value={newRoomName}
                                        disabled={creating}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="create-room-lang">Default Language</label>
                                    <select
                                        id="create-room-lang"
                                        className="input"
                                        value={newRoomLang}
                                        disabled={creating}
                                        onChange={(e) => setNewRoomLang(e.target.value)}
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={creating || !newRoomName.trim()}
                                >
                                    <Plus size={15} aria-hidden="true" />
                                    <span>{creating ? 'Creating room...' : 'Create room'}</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Secondary Action Window: Join with Code */}
                    <div className="window">
                        <div className="window-header">
                            <span className="window-title">
                                <LogIn size={15} aria-hidden="true" />
                                <span>Join with code</span>
                            </span>
                            <span className="badge">Collaborator</span>
                        </div>

                        <div className="window-body">
                            <p className="dashboard-panel-desc">
                                Enter an 8-character room code. The room host will be prompted to approve your
                                request.
                            </p>

                            {joinError && (
                                <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-3)' }}>
                                    {joinError}
                                </div>
                            )}

                            <form onSubmit={handleJoinByCode}>
                                <div className="form-group">
                                    <label htmlFor="join-room-code">Room Code</label>
                                    <input
                                        id="join-room-code"
                                        className="input"
                                        type="text"
                                        placeholder="e.g. 17bf51a3"
                                        value={joinRoomIdInput}
                                        disabled={joining}
                                        onChange={(e) => setJoinRoomIdInput(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-secondary"
                                    style={{ width: '100%', marginTop: 'var(--s-5)' }}
                                    disabled={joining || !joinRoomIdInput.trim()}
                                >
                                    <LogIn size={15} aria-hidden="true" />
                                    <span>{joining ? 'Requesting access...' : 'Join with code'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* User's Rooms Section */}
                <section className="dashboard-rooms-section" aria-labelledby="your-rooms-heading">
                    <div className="dashboard-section-header">
                        <h2 id="your-rooms-heading" className="dashboard-section-title">
                            Your workspaces
                        </h2>
                        <span className="badge">{rooms.length} total</span>
                    </div>

                    {rooms.length === 0 ? (
                        <div className="window dashboard-empty-window">
                            <div className="window-header">
                                <span className="window-title">No workspaces yet</span>
                            </div>
                            <div className="window-body dashboard-empty-body">
                                <div className="dashboard-empty-icon" aria-hidden="true">
                                    <FolderGit2 size={24} />
                                </div>
                                <h3 className="dashboard-empty-heading">Your workbench is clean and ready</h3>
                                <p className="dashboard-empty-text">
                                    You haven&apos;t created or joined any collaborative coding rooms yet. Spin up a
                                    new room to start writing and executing code with your peers.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => createNameInputRef.current?.focus()}
                                >
                                    <Plus size={15} aria-hidden="true" />
                                    <span>Create your first room</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-rooms-grid" role="list">
                            {rooms.map((r) => (
                                <article
                                    key={r._id || r.roomId}
                                    className="window room-window-card"
                                    role="listitem"
                                >
                                    <div className="window-header">
                                        <span className="window-title">
                                            <GitBranch size={14} aria-hidden="true" />
                                            <code>{r.roomId}</code>
                                        </span>
                                        <span className="badge">{r.language || 'javascript'}</span>
                                    </div>

                                    <div className="window-body room-window-body">
                                        <div className="room-window-info">
                                            <h3 className="room-window-name">{r.name}</h3>
                                            <div className="room-window-meta">
                                                <span className="room-meta-item">
                                                    <Clock size={12} aria-hidden="true" />
                                                    <span>{formatLastActive(r)}</span>
                                                </span>
                                                <span>•</span>
                                                <span>{r.files?.length || 1} items</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => onEnterRoom(r)}
                                            aria-label={`Open workspace ${r.name}`}
                                        >
                                            <span>Open</span>
                                            <ArrowRight size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
