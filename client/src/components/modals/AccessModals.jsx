import { useState, useEffect, useRef } from 'react';
import {
    Check,
    Copy,
    Clock,
    ShieldAlert,
    UserCheck,
    UserX,
    Plus,
    LogIn,
    KeyRound,
} from 'lucide-react';
import { LANGUAGES, getStarterFiles } from '../../constants/workspaceConfig';
import { apiRequest } from '../../api';

export default function AccessModals({
    waitingApproval,
    incomingRequest,
    activeRoomName,
    onCancelWait,
    onHostDecision,
    joinDenied = false,
    onDismissDenied,
    showCreateModal = false,
    onCloseCreateModal,
    onRoomCreated,
    showJoinModal = false,
    onCloseJoinModal,
    onRoomJoined,
}) {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomLang, setNewRoomLang] = useState('javascript');
    const [createdRoom, setCreatedRoom] = useState(null);
    const [copiedCode, setCopiedCode] = useState(false);

    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const dialogRef = useRef(null);

    const isAnyModalOpen =
        waitingApproval || incomingRequest || joinDenied || showCreateModal || showJoinModal;

    useEffect(() => {
        if (!isAnyModalOpen) return;

        const modalEl = dialogRef.current;
        if (!modalEl) return;

        const focusableSelector =
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusables = modalEl.querySelectorAll(focusableSelector);
        if (focusables.length > 0) {
            focusables[0].focus();
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (waitingApproval && onCancelWait) onCancelWait();
                else if (incomingRequest && onHostDecision) onHostDecision(false);
                else if (joinDenied && onDismissDenied) onDismissDenied();
                else if (showCreateModal && onCloseCreateModal) onCloseCreateModal();
                else if (showJoinModal && onCloseJoinModal) onCloseJoinModal();
                return;
            }

            if (e.key === 'Tab') {
                const currentFocusables = modalEl.querySelectorAll(focusableSelector);
                if (currentFocusables.length === 0) return;
                const first = currentFocusables[0];
                const last = currentFocusables[currentFocusables.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isAnyModalOpen,
        waitingApproval,
        incomingRequest,
        joinDenied,
        showCreateModal,
        showJoinModal,
        onCancelWait,
        onHostDecision,
        onDismissDenied,
        onCloseCreateModal,
        onCloseJoinModal,
    ]);

    const handleCopyCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;
        setErrorMsg('');
        setLoading(true);
        try {
            const starter = getStarterFiles(newRoomLang);
            const data = await apiRequest('/api/rooms', {
                method: 'POST',
                body: JSON.stringify({
                    name: newRoomName.trim(),
                    language: newRoomLang,
                    files: starter,
                }),
            });
            const roomObj = {
                ...data.room,
                files: data.room.files?.length ? data.room.files : starter,
            };
            setCreatedRoom(roomObj);
        } catch (err) {
            setErrorMsg(err.message || 'Could not create workspace.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinSubmit = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setErrorMsg('');
        setLoading(true);
        try {
            const data = await apiRequest(`/api/rooms/${joinCode.trim()}`);
            if (onRoomJoined) onRoomJoined(data.room);
            if (onCloseJoinModal) onCloseJoinModal();
        } catch (err) {
            setErrorMsg(err.message || 'Room code not found.');
        } finally {
            setLoading(false);
        }
    };

    if (!isAnyModalOpen) return null;

    return (
        <>
            {waitingApproval && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-waiting-title"
                >
                    <div ref={dialogRef} className="window modal-window">
                        <div className="window-header">
                            <span id="modal-waiting-title" className="window-title">
                                <Clock size={15} aria-hidden="true" />
                                <span>Waiting for host approval</span>
                            </span>
                            {onCancelWait && (
                                <button
                                    type="button"
                                    className="window-control-box"
                                    aria-label="Cancel join request"
                                    onClick={onCancelWait}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="window-body">
                            <div className="modal-status-row">
                                <span className="badge badge-accent">Request Pending</span>
                                {activeRoomName && <span className="badge">{activeRoomName}</span>}
                            </div>

                            <p className="modal-description">
                                Your request to join <strong>{activeRoomName || 'this workspace'}</strong> has been
                                sent to the host. You will enter the studio automatically once approved.
                            </p>

                            <div className="modal-waiting-bar" aria-hidden="true">
                                <span className="modal-waiting-step" />
                                <span className="modal-waiting-step" />
                                <span className="modal-waiting-step" />
                            </div>

                            <div className="modal-actions-row">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                    onClick={onCancelWait}
                                >
                                    Cancel and return to dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {incomingRequest && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-host-prompt-title"
                >
                    <div ref={dialogRef} className="window modal-window">
                        <div className="window-header">
                            <span id="modal-host-prompt-title" className="window-title">
                                <KeyRound size={15} aria-hidden="true" />
                                <span>Collaborator access request</span>
                            </span>
                            <span className="badge badge-accent">Host Action</span>
                        </div>

                        <div className="window-body">
                            <div className="modal-requester-card">
                                <div className="studio-avatar" aria-hidden="true">
                                    {incomingRequest.username?.slice(0, 2).toUpperCase() || 'GU'}
                                </div>
                                <div className="modal-requester-info">
                                    <div className="modal-requester-name">{incomingRequest.username}</div>
                                    <div className="modal-requester-sub">
                                        Requesting live edit access to <strong>{activeRoomName}</strong>
                                    </div>
                                </div>
                            </div>

                            <p className="modal-description">
                                Approving allows this collaborator to view, edit, and run code in your workspace
                                session.
                            </p>

                            <div className="modal-actions-row">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={() => onHostDecision(true)}
                                >
                                    <UserCheck size={15} aria-hidden="true" />
                                    <span>Approve</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    style={{ flex: 1 }}
                                    onClick={() => onHostDecision(false)}
                                >
                                    <UserX size={15} aria-hidden="true" />
                                    <span>Deny</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {joinDenied && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-denied-title"
                >
                    <div ref={dialogRef} className="window modal-window">
                        <div className="window-header">
                            <span id="modal-denied-title" className="window-title">
                                <ShieldAlert size={15} aria-hidden="true" />
                                <span>Access request declined</span>
                            </span>
                            {onDismissDenied && (
                                <button
                                    type="button"
                                    className="window-control-box"
                                    aria-label="Close dialog"
                                    onClick={onDismissDenied}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="window-body">
                            <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-4)' }}>
                                The workspace host declined your request to join this session.
                            </div>

                            <p className="modal-description">
                                Verify the 8-character room code with the host or ask them to approve your next
                                join request.
                            </p>

                            <div className="modal-actions-row">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                    onClick={onDismissDenied}
                                >
                                    Back to dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-create-title"
                >
                    <div ref={dialogRef} className="window modal-window">
                        <div className="window-header">
                            <span id="modal-create-title" className="window-title">
                                <Plus size={15} aria-hidden="true" />
                                <span>{createdRoom ? 'Room ready to share' : 'Create room'}</span>
                            </span>
                            {onCloseCreateModal && (
                                <button
                                    type="button"
                                    className="window-control-box"
                                    aria-label="Close create room modal"
                                    onClick={() => {
                                        setCreatedRoom(null);
                                        setErrorMsg('');
                                        onCloseCreateModal();
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="window-body">
                            {errorMsg && (
                                <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-3)' }}>
                                    {errorMsg}
                                </div>
                            )}

                            {!createdRoom ? (
                                <form onSubmit={handleCreateSubmit}>
                                    <div className="form-group">
                                        <label htmlFor="modal-room-name">Room Name</label>
                                        <input
                                            id="modal-room-name"
                                            className="input"
                                            type="text"
                                            required
                                            disabled={loading}
                                            placeholder="e.g. Algorithm-Sprint"
                                            value={newRoomName}
                                            onChange={(e) => setNewRoomName(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="modal-room-lang">Language</label>
                                        <select
                                            id="modal-room-lang"
                                            className="input"
                                            disabled={loading}
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

                                    <div className="modal-actions-row">
                                        {onCloseCreateModal && (
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={onCloseCreateModal}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ flex: 1 }}
                                            disabled={loading || !newRoomName.trim()}
                                        >
                                            <Plus size={15} aria-hidden="true" />
                                            <span>{loading ? 'Creating...' : 'Create room'}</span>
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <p className="modal-description">
                                        Share this room code with your collaborators so they can request access:
                                    </p>

                                    <div className="share-code-box">
                                        <div className="share-code-meta">
                                            <span className="share-code-label">SHAREABLE ROOM CODE</span>
                                            <code className="share-code-value">{createdRoom.roomId}</code>
                                        </div>

                                        <button
                                            type="button"
                                            className={`btn ${copiedCode ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleCopyCode(createdRoom.roomId)}
                                        >
                                            {copiedCode ? (
                                                <>
                                                    <Check size={14} aria-hidden="true" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} aria-hidden="true" />
                                                    <span>Copy code</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="modal-actions-row">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ width: '100%' }}
                                            onClick={() => {
                                                if (onRoomCreated) onRoomCreated(createdRoom);
                                                setCreatedRoom(null);
                                            }}
                                        >
                                            Enter Studio →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showJoinModal && (
                <div
                    className="modal-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-join-title"
                >
                    <div ref={dialogRef} className="window modal-window">
                        <div className="window-header">
                            <span id="modal-join-title" className="window-title">
                                <LogIn size={15} aria-hidden="true" />
                                <span>Join room with code</span>
                            </span>
                            {onCloseJoinModal && (
                                <button
                                    type="button"
                                    className="window-control-box"
                                    aria-label="Close join room modal"
                                    onClick={() => {
                                        setErrorMsg('');
                                        onCloseJoinModal();
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="window-body">
                            {errorMsg && (
                                <div className="alert-danger" role="alert" style={{ marginBottom: 'var(--s-3)' }}>
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleJoinSubmit}>
                                <div className="form-group">
                                    <label htmlFor="modal-join-code-input">8-Character Room Code</label>
                                    <input
                                        id="modal-join-code-input"
                                        className="input"
                                        type="text"
                                        required
                                        disabled={loading}
                                        placeholder="e.g. 17bf51a3"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                    />
                                </div>

                                <div className="modal-actions-row">
                                    {onCloseJoinModal && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={onCloseJoinModal}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        disabled={loading || !joinCode.trim()}
                                    >
                                        <LogIn size={15} aria-hidden="true" />
                                        <span>{loading ? 'Requesting...' : 'Request access'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
