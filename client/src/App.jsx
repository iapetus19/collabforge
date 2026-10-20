import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import {
  Code2,
  Play,
  Copy,
  Check,
  Users,
  Plus,
  LogIn,
  LogOut,
  Terminal,
  ArrowLeft,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  API_BASE_URL,
  apiRequest,
  getAuthToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
} from './api';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript (Node VM)' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python 3' },
  { id: 'cpp', label: 'C++ (GCC)' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
];

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLang, setNewRoomLang] = useState('javascript');
  const [joinRoomIdInput, setJoinRoomIdInput] = useState('');

  // Active Room IDE state
  const [activeRoom, setActiveRoom] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState([]);
  const [activityBanner, setActivityBanner] = useState('Connected to real-time sync');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Execution state
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('// Click "Run Code" to execute in sandbox...');
  const [stderr, setStderr] = useState('');
  const [execTime, setExecTime] = useState(null);

  const socketRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const fetchRooms = async () => {
    try {
      const data = await apiRequest('/api/rooms');
      setRooms(data.rooms || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  // Connect Socket.io when entering a room
  useEffect(() => {
    if (!activeRoom || !user) return;

    const socket = io(API_BASE_URL, {
      auth: { token: getAuthToken() },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomId: activeRoom.roomId,
        initialCode: activeRoom.code,
        initialLanguage: activeRoom.language,
      });
    });

    socket.on('room-sync', ({ code: syncedCode, language: syncedLang, participants: list }) => {
      if (typeof syncedCode === 'string') {
        isRemoteUpdateRef.current = true;
        setCode(syncedCode);
      }
      if (syncedLang) setLanguage(syncedLang);
      if (list) setParticipants(list);
    });

    socket.on('participants-update', ({ participants: list, joinedUser, leftUser }) => {
      setParticipants(list || []);
      if (joinedUser) setActivityBanner(`${joinedUser} joined the room`);
      if (leftUser) setActivityBanner(`${leftUser} left the room`);
    });

    socket.on('code-update', ({ code: incomingCode, updatedBy }) => {
      isRemoteUpdateRef.current = true;
      setCode(incomingCode);
      setActivityBanner(`${updatedBy} is typing...`);
    });

    socket.on('language-update', ({ language: incomingLang, updatedBy }) => {
      setLanguage(incomingLang);
      setActivityBanner(`${updatedBy} switched language to ${incomingLang}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeRoom?.roomId, user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthSession(data.accessToken, data.user);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setActiveRoom(null);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: newRoomName, language: newRoomLang }),
      });
      setNewRoomName('');
      enterRoom(data.room);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinRoomIdInput.trim()) return;
    try {
      const data = await apiRequest(`/api/rooms/${joinRoomIdInput.trim()}`);
      enterRoom(data.room);
    } catch (err) {
      alert(err.message);
    }
  };

  const enterRoom = (room) => {
    setActiveRoom(room);
    setCode(room.code);
    setLanguage(room.language);
    setOutput('// Click "Run Code" to execute in sandbox...');
    setStderr('');
  };

  const handleEditorChange = (value) => {
    const updated = value ?? '';
    setCode(updated);

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (socketRef.current && activeRoom) {
      socketRef.current.emit('code-change', {
        roomId: activeRoom.roomId,
        code: updated,
      });
    }

    // Debounced auto-save to MongoDB every 1.5s after typing stops
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistRoomState(updated, language);
    }, 1500);
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (socketRef.current && activeRoom) {
      socketRef.current.emit('language-change', {
        roomId: activeRoom.roomId,
        language: newLang,
      });
    }
    persistRoomState(code, newLang);
  };

  const persistRoomState = async (codeToSave = code, langToSave = language) => {
    if (!activeRoom) return;
    setSaving(true);
    try {
      await apiRequest(`/api/rooms/${activeRoom.roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ code: codeToSave, language: langToSave }),
      });
    } catch (err) {
      console.error('Auto-save failed:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunCode = async () => {
    setRunning(true);
    setStderr('');
    setOutput('Running...');
    try {
      const result = await apiRequest('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code, language }),
      });
      setOutput(result.output || '');
      setStderr(result.stderr || '');
      setExecTime(result.executionTimeMs);
    } catch (err) {
      setStderr(err.message);
      setOutput('');
    } finally {
      setRunning(false);
    }
  };

  const copyRoomId = () => {
    if (!activeRoom) return;
    navigator.clipboard.writeText(activeRoom.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. AUTH VIEW
  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="card">
          <div className="brand-header" style={{ marginBottom: 6 }}>
            <Code2 size={26} color="#38bdf8" />
            <span>CollabForge IDE</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 22 }}>
            Real-time distributed collaborative code editor
          </p>

          {authError && (
            <div
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: '0.84rem',
                marginBottom: 14,
              }}
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div className="form-group">
                <label>Username</label>
                <input
                  className="input"
                  type="text"
                  required
                  placeholder="priyanshu"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                className="input"
                type="email"
                required
                placeholder="you@collabforge.dev"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="input"
                type="password"
                required
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign In to Workspace'
                  : 'Create Account'}
            </button>
          </form>

          <div
            style={{
              marginTop: 18,
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {authMode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ROOM DASHBOARD VIEW
  if (!activeRoom) {
    return (
      <div>
        <header className="topbar">
          <div className="brand-header">
            <Code2 size={24} color="#38bdf8" />
            <span>CollabForge</span>
            <span className="badge">v1.0 Live Sync</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Signed in as <strong style={{ color: 'var(--text-main)' }}>{user.username}</strong>
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        <main className="dashboard-container">
          <div className="grid-2">
            {/* Create Room Card */}
            <div className="card" style={{ maxWidth: '100%' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Plus size={18} color="#38bdf8" /> Create New Collaborative Room
              </h3>
              <form onSubmit={handleCreateRoom}>
                <div className="form-group">
                  <label>Room Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Dijkstra Graph Lab"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Default Language</label>
                  <select
                    className="input"
                    value={newRoomLang}
                    onChange={(e) => setNewRoomLang(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Sparkles size={16} /> Launch Room
                </button>
              </form>
            </div>

            {/* Join Room by ID Card */}
            <div className="card" style={{ maxWidth: '100%' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <LogIn size={18} color="#22c55e" /> Join Existing Room by ID
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Paste an 8-character Room ID shared by a collaborator to join their live session immediately.
              </p>
              <form onSubmit={handleJoinByCode}>
                <div className="form-group">
                  <label>Room ID</label>
                  <input
                    className="input"
                    placeholder="e.g. c071b776"
                    value={joinRoomIdInput}
                    onChange={(e) => setJoinRoomIdInput(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: 12 }}
                >
                  Join Live Session
                </button>
              </form>
            </div>
          </div>

          {/* Existing Rooms List */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ marginBottom: 14, fontSize: '1rem', color: 'var(--text-muted)' }}>
              Your Recent Rooms ({rooms.length})
            </h3>
            {rooms.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No rooms created yet. Create one above to start coding!
              </p>
            ) : (
              rooms.map((r) => (
                <div key={r._id} className="room-item" onClick={() => enterRoom(r)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Room ID: <code>{r.roomId}</code> • Language: {r.language}
                    </div>
                  </div>
                  <button className="btn btn-secondary">Open IDE →</button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // 3. LIVE COLLABORATIVE MONACO IDE VIEW
  return (
    <div className="ide-layout">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              fetchRooms();
              setActiveRoom(null);
            }}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{activeRoom.name}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{activityBanner}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" onClick={copyRoomId} title="Copy Room ID">
            {copied ? <Check size={15} color="#22c55e" /> : <Copy size={15} />}
            <span>ID: {activeRoom.roomId}</span>
          </button>

          <select className="input" value={language} onChange={handleLanguageChange}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={() => persistRoomState()} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>

          <button className="btn btn-success" onClick={handleRunCode} disabled={running}>
            <Play size={15} /> {running ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </header>

      <div className="ide-main">
        {/* Left Sidebar: Active Collaborators */}
        <aside className="sidebar">
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 12,
              }}
            >
              <Users size={15} /> Active Collaborators ({participants.length})
            </div>

            {participants.map((p) => (
              <div key={p.socketId} className="user-pill">
                <div className="avatar-dot" style={{ background: p.color || '#38bdf8' }}>
                  {p.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.username} {p.id === user.id ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#22c55e' }}>● Online</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Share Room ID <strong>{activeRoom.roomId}</strong> with another tab or teammate to edit simultaneously.
          </div>
        </aside>

        {/* Center: Monaco Code Editor */}
        <section style={{ height: '100%', overflow: 'hidden' }}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={handleEditorChange}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
              tabSize: 2,
            }}
          />
        </section>

        {/* Right Panel: Execution Output Terminal */}
        <aside className="output-panel">
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={15} color="#38bdf8" /> Execution Console
            </span>
            {execTime !== null && <span className="badge">{execTime} ms</span>}
          </div>
          <div className="terminal-output">
            {output && <div>{output}</div>}
            {stderr && (
              <div style={{ color: '#f87171', marginTop: output ? 10 : 0 }}>
                {stderr}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
