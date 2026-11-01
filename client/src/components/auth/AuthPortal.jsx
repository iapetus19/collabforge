import { useState, useEffect, useRef } from 'react';
import { apiRequest, setAuthSession } from '../../api';

const BG_CODE_WATERMARK = `// CollabForge Studio — Distributed Real-Time Engine
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { spawn } from 'node:child_process';

export async function syncWorkspaceTree(roomId, files) {
  const targetDir = \`/tmp/collabforge-workspaces/\${roomId}\`;
  for (const node of files) {
    if (node.type === 'folder') await fs.mkdir(node.name, { recursive: true });
    else await fs.writeFile(node.name, node.content, 'utf-8');
  }
  return scanDiskToVirtualFiles(targetDir);
}

public class Main {
  public static void main(String[] args) {
    List<Integer> nodes = Arrays.asList(1024, 2048, 4096);
    System.out.println("Cluster Quorum Ready: " + nodes.size());
  }
}

#include <iostream>
#include <vector>
using namespace std;
int main() {
  vector<int> latencyMs = {4, 6, 8, 5};
  cout << "Broadcast overhead < 10ms" << endl;
  return 0;
}`;

export default function AuthPortal({ onAuthSuccess }) {
    const [authMode, setAuthMode] = useState('login');
    const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [googleName, setGoogleName] = useState('');

    const pageRef = useRef(null);
    const canvasRef = useRef(null);

    // Interactive Retro Expanding Pixel Grid Engine (reads all colors from CSS variables)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const rootStyles = getComputedStyle(document.documentElement);
        const token = (name) => rootStyles.getPropertyValue(name).trim();

        const palette = {
            ink: token('--ink'),
            inkMuted: token('--ink-muted'),
            surface: token('--surface'),
            surfaceAlt: token('--surface-alt'),
            surfaceMuted: token('--surface-muted'),
            accent: token('--accent'),
            success: token('--success'),
        };

        const fillTokens = [
            palette.surfaceAlt,
            palette.accent,
            palette.surfaceMuted,
            palette.success,
        ];

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const CELL_SIZE = 24;
        const INFLUENCE_RADIUS = 190;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let cols = Math.ceil(width / CELL_SIZE);
        let rows = Math.ceil(height / CELL_SIZE);
        let cells = [];

        const initGrid = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;

            cols = Math.ceil(width / CELL_SIZE);
            rows = Math.ceil(height / CELL_SIZE);
            cells = new Array(cols * rows).fill(null).map((_, idx) => ({
                energy: 0,
                targetEnergy: 0,
                colorIndex: (idx * 7 + (idx % 13)) % fillTokens.length,
            }));
        };

        initGrid();

        const mouse = { x: -9999, y: -9999, active: false };

        const handlePointerMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;

            if (pageRef.current) {
                pageRef.current.style.setProperty('--cursor-x', `${e.clientX}px`);
                pageRef.current.style.setProperty('--cursor-y', `${e.clientY}px`);
            }

            if (prefersReducedMotion) return;

            const minCol = Math.max(0, Math.floor((mouse.x - INFLUENCE_RADIUS) / CELL_SIZE));
            const maxCol = Math.min(cols - 1, Math.ceil((mouse.x + INFLUENCE_RADIUS) / CELL_SIZE));
            const minRow = Math.max(0, Math.floor((mouse.y - INFLUENCE_RADIUS) / CELL_SIZE));
            const maxRow = Math.min(rows - 1, Math.ceil((mouse.y + INFLUENCE_RADIUS) / CELL_SIZE));

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const cx = c * CELL_SIZE + CELL_SIZE / 2;
                    const cy = r * CELL_SIZE + CELL_SIZE / 2;
                    const dist = Math.hypot(mouse.x - cx, mouse.y - cy);

                    if (dist < INFLUENCE_RADIUS) {
                        // Stepped retro falloff curve
                        const raw = 1 - dist / INFLUENCE_RADIUS;
                        const stepped = Math.ceil(raw * 5) / 5;
                        const cell = cells[r * cols + c];
                        if (cell && stepped > cell.energy) {
                            cell.energy = stepped;
                        }
                    }
                }
            }
        };

        let rafId;
        const render = () => {
            ctx.clearRect(0, 0, width, height);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = cells[r * cols + c];
                    const cx = c * CELL_SIZE + CELL_SIZE / 2;
                    const cy = r * CELL_SIZE + CELL_SIZE / 2;

                    // Base resting 2px retro dither dot
                    if (cell.energy <= 0.04) {
                        ctx.globalAlpha = 0.16;
                        ctx.fillStyle = palette.inkMuted;
                        ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - 1), 2, 2);
                        cell.energy = 0;
                        continue;
                    }

                    // Quantize pixel expansion into discrete 4px retro steps (4, 8, 12, 16, 20, 22)
                    const rawSize = 4 + cell.energy * (CELL_SIZE - 4);
                    const steppedSize = Math.max(4, Math.round(rawSize / 4) * 4);
                    const half = steppedSize / 2;
                    const x = Math.floor(cx - half);
                    const y = Math.floor(cy - half);

                    ctx.globalAlpha = Math.min(0.85, 0.25 + cell.energy * 0.65);
                    ctx.fillStyle = fillTokens[cell.colorIndex];
                    ctx.fillRect(x, y, steppedSize, steppedSize);

                    if (steppedSize >= 8) {
                        ctx.strokeStyle = palette.ink;
                        ctx.lineWidth = steppedSize >= 16 ? 2 : 1.5;
                        ctx.strokeRect(x, y, steppedSize, steppedSize);
                    }

                    // Inner pixel highlight square on peak expansion
                    if (steppedSize >= 16) {
                        ctx.fillStyle = palette.surface;
                        ctx.fillRect(x + 3, y + 3, 4, 4);
                    }

                    // Decay trail smoothly
                    cell.energy *= 0.91;
                }
            }

            ctx.globalAlpha = 1;
            if (!prefersReducedMotion) {
                rafId = requestAnimationFrame(render);
            }
        };

        render();
        window.addEventListener('resize', initGrid);
        window.addEventListener('pointermove', handlePointerMove);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('resize', initGrid);
            window.removeEventListener('pointermove', handlePointerMove);
        };
    }, []);

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
            window.history.replaceState({}, '', window.location.pathname);
            onAuthSuccess(data.user);
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (e) => {
        if (e) e.preventDefault();
        setAuthError('');
        setLoading(true);
        try {
            const data = await apiRequest('/api/auth/google', {
                method: 'POST',
                body: JSON.stringify({
                    email: googleEmail.includes('@') ? googleEmail : `${googleEmail}@gmail.com`,
                    name: googleName || googleEmail.split('@')[0],
                }),
            });
            setAuthSession(data.accessToken, data.user);
            window.history.replaceState({}, '', window.location.pathname);
            onAuthSuccess(data.user);
            setShowGoogleModal(false);
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={pageRef} className="auth-page">
            {/* Interactive Retro Pixel Expansion Canvas */}
            <canvas ref={canvasRef} className="auth-pixel-canvas" aria-hidden="true" />

            {/* Muted/Translucent Written-Code Watermark Layer */}
            <div className="auth-code-backdrop" aria-hidden="true">
                <pre className="auth-code-watermark">{BG_CODE_WATERMARK}</pre>
                <pre className="auth-code-watermark">{BG_CODE_WATERMARK}</pre>
            </div>

            <div className="auth-grid">
                {/* LEFT COLUMN: Dull/Translucent Showcase that brightens on hover */}
                <section className="auth-showcase" aria-label="Product Overview">
                    <div className="auth-brand-row">
                        <div className="logo-tile" aria-hidden="true">
                            ◆
                        </div>
                        <span className="auth-brand-name">CollabForge Studio</span>
                        <span className="badge badge-success">v2.4 Live</span>
                    </div>

                    <h1 className="auth-headline">
                        Real-time multi-file coding, built like a classic desktop workbench.
                    </h1>
                    <p className="auth-pitch">
                        Spin up an isolated workspace, approve collaborators with one click, sync nested
                        Git-style file trees in under 10ms, and execute Node.js, Python 3, Java, and C++17 code
                        directly against disk.
                    </p>

                    {/* Illustrated Retro Window Collage */}
                    <div className="auth-collage" aria-hidden="true">
                        <div className="window collage-window-main">
                            <div className="window-header">
                                <span className="window-title">src/workspace_sync.ts</span>
                                <div className="window-controls">
                                    <span className="window-control-box">-</span>
                                    <span className="window-control-box">□</span>
                                    <span className="window-control-box">×</span>
                                </div>
                            </div>
                            <div className="collage-code-body">
                                <div className="collage-code-line">
                                    <span className="collage-ln">01</span>
                                    <span>
                                        <strong className="tok-kw">import</strong> &#123; Socket &#125;{' '}
                                        <strong className="tok-kw">from</strong>{' '}
                                        <span className="tok-str">&apos;socket.io-client&apos;</span>;
                                    </span>
                                </div>
                                <div className="collage-code-line">
                                    <span className="collage-ln">02</span>
                                    <span>
                                        <strong className="tok-kw">export function</strong>{' '}
                                        <span className="tok-type">mountStudio</span>(roomId) &#123;
                                    </span>
                                </div>
                                <div className="collage-code-line">
                                    <span className="collage-ln">03</span>
                                    <span>
                                        {'  '}socket.<span className="tok-type">emit</span>(
                                        <span className="tok-str">&apos;request-join&apos;</span>, &#123; roomId &#125;);
                                    </span>
                                </div>
                                <div className="collage-code-line">
                                    <span className="collage-ln">04</span>
                                    <span className="tok-comment">
                                        {'  '}// Bidirectional /tmp disk materialization ready
                                    </span>
                                </div>
                                <div className="collage-code-line">
                                    <span className="collage-ln">05</span>
                                    <span>
                                        {'  '}
                                        <strong className="tok-kw">return</strong>{' '}
                                        <span className="tok-num">200</span>;
                                    </span>
                                </div>
                                <div className="collage-code-line">
                                    <span className="collage-ln">06</span>
                                    <span>&#125;</span>
                                </div>
                            </div>
                        </div>

                        <div className="window collage-window-sub">
                            <div className="window-header">
                                <span className="window-title">sandbox_terminal.sh</span>
                                <span className="badge badge-success">6 ms</span>
                            </div>
                            <div className="collage-term-body">
                                <div>❯ npm init -y &amp;&amp; javac src/Main.java</div>
                                <div className="collage-term-ok">
                                    [Exited with code 0 • Synced package.json to Explorer]
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT COLUMN: High-Contrast Hero Authentication Window */}
                <section className="auth-card-column" aria-label="Authentication Window">
                    <div className="window auth-window auth-main-card">
                        <div className="window-header">
                            <span className="window-title">
                                {authMode === 'login' ? 'Sign In — Studio Access' : 'Register — New Developer'}
                            </span>
                            <div className="window-controls" aria-hidden="true">
                                <span className="window-control-box">×</span>
                            </div>
                        </div>

                        <div className="window-body">
                            <div className="auth-window-intro">
                                <h2 className="auth-window-heading">
                                    {authMode === 'login' ? 'Welcome back, developer' : 'Create your studio pass'}
                                </h2>
                                <p className="auth-window-sub">
                                    {authMode === 'login'
                                        ? 'Enter your credentials to mount your cloud workspaces.'
                                        : 'Set up your account to start hosting live coding rooms.'}
                                </p>
                            </div>

                            {authError && (
                                <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-4)' }}>
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleAuthSubmit}>
                                {authMode === 'register' && (
                                    <div className="form-group">
                                        <label htmlFor="auth-username">Username</label>
                                        <input
                                            id="auth-username"
                                            className="input"
                                            type="text"
                                            required
                                            disabled={loading}
                                            placeholder="priyanshu"
                                            value={authForm.username}
                                            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="auth-email">Email Address</label>
                                    <input
                                        id="auth-email"
                                        className="input"
                                        type="email"
                                        required
                                        disabled={loading}
                                        placeholder="dev@collabforge.studio"
                                        value={authForm.email}
                                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="auth-password">Password</label>
                                    <input
                                        id="auth-password"
                                        className="input"
                                        type="password"
                                        required
                                        disabled={loading}
                                        placeholder="••••••••"
                                        value={authForm.password}
                                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: 'var(--s-2)' }}
                                    disabled={loading}
                                >
                                    {loading
                                        ? 'Authenticating...'
                                        : authMode === 'login'
                                            ? 'Enter Studio →'
                                            : 'Create Studio Account →'}
                                </button>
                            </form>

                            <div className="auth-divider">
                                <span className="auth-divider-line" />
                                <span className="auth-divider-text">OR</span>
                                <span className="auth-divider-line" />
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                disabled={loading}
                                onClick={() => setShowGoogleModal(true)}
                            >
                                <span className="lang-badge lang-js" aria-hidden="true">
                                    G
                                </span>
                                <span>Continue with Google</span>
                            </button>

                            <div className="auth-toggle-footer">
                                <span>
                                    {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                                </span>
                                <button
                                    type="button"
                                    className="auth-link-btn"
                                    onClick={() => {
                                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                                        setAuthError('');
                                    }}
                                >
                                    {authMode === 'login' ? 'Register now' : 'Sign in instead'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Google Account Modal */}
            {showGoogleModal && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="google-modal-title"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowGoogleModal(false);
                    }}
                >
                    <div className="window" style={{ maxWidth: 400, width: '100%' }}>
                        <div className="window-header">
                            <span id="google-modal-title" className="window-title">
                                Sign in with Google
                            </span>
                            <button
                                type="button"
                                className="window-control-box"
                                aria-label="Close modal"
                                onClick={() => setShowGoogleModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="window-body">
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-muted)', marginBottom: 'var(--s-4)' }}>
                                Enter your Gmail address to continue to <strong>CollabForge Studio</strong>.
                            </p>

                            <form onSubmit={handleGoogleLogin}>
                                <div className="form-group">
                                    <label htmlFor="google-email-input">Gmail Address</label>
                                    <input
                                        id="google-email-input"
                                        className="input"
                                        type="email"
                                        required
                                        disabled={loading}
                                        placeholder="priyanshu@gmail.com"
                                        value={googleEmail}
                                        onChange={(e) => setGoogleEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="google-name-input">Display Name (Optional)</label>
                                    <input
                                        id="google-name-input"
                                        className="input"
                                        type="text"
                                        disabled={loading}
                                        placeholder="Priyanshu Mishra"
                                        value={googleName}
                                        onChange={(e) => setGoogleName(e.target.value)}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--s-3)', marginTop: 'var(--s-4)' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => setShowGoogleModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={loading}
                                    >
                                        {loading ? 'Signing in...' : 'Continue'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
