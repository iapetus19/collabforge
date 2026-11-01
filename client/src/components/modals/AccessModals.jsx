import { useState, useEffect, useRef } from 'react';
import {
    Clock,
    ShieldAlert,
    UserCheck,
    UserX,
    KeyRound,
} from 'lucide-react';

export default function AccessModals({
    waitingApproval,
    incomingRequest,
    activeRoomName,
    onCancelWait,
    onHostDecision,
    joinDenied = false,
    onDismissDenied,
}) {
    const dialogRef = useRef(null);

    const isAnyModalOpen = waitingApproval || incomingRequest || joinDenied;

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
        onCancelWait,
        onHostDecision,
        onDismissDenied,
    ]);

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
        </>
    );
}
