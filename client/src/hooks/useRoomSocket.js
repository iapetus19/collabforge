import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, getAuthToken } from '../api';
import { getStarterFiles } from '../constants/workspaceConfig';

export function useRoomSocket({
  activeRoom,
  user,
  isRemoteUpdateRef,
  setFiles,
  setLanguage,
  setParticipants,
  setActivityBanner,
  setWaitingApproval,
  setIncomingRequest,
  leaveRoomToDashboard,
}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!activeRoom || !user) return;

    const socket = io(API_BASE_URL, {
      auth: { token: getAuthToken() },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('request-join', {
        roomId: activeRoom.roomId,
        ownerId: activeRoom.owner,
      });
    });

    socket.on('waiting-for-approval', () => {
      setWaitingApproval(true);
      setActivityBanner('Waiting for host approval...');
    });

    socket.on('join-rejected', () => {
      setWaitingApproval(false);
      alert('The room host declined your join request.');
      leaveRoomToDashboard();
    });

    socket.on('join-approved', () => {
      setWaitingApproval(false);
      socket.emit('join-room', {
        roomId: activeRoom.roomId,
        initialFiles: activeRoom.files?.length
          ? activeRoom.files
          : getStarterFiles(activeRoom.language),
        initialLanguage: activeRoom.language,
      });
    });

    socket.on('pending-join-request', ({ guestSocketId, guestUserId, username }) => {
      setIncomingRequest({ guestSocketId, guestUserId, username });
    });

    socket.on('room-sync', ({ files: syncedFiles, language: syncedLang, participants: list }) => {
      if (syncedFiles && Array.isArray(syncedFiles) && syncedFiles.length > 0) {
        isRemoteUpdateRef.current = true;
        setFiles(syncedFiles);
      }
      if (syncedLang) setLanguage(syncedLang);
      if (list) setParticipants(list);
    });

    socket.on('participants-update', ({ participants: list, joinedUser, leftUser }) => {
      setParticipants(list || []);
      if (joinedUser) setActivityBanner(`${joinedUser} connected`);
      if (leftUser) setActivityBanner(`${leftUser} disconnected`);
    });

    socket.on('file-update', ({ files: incomingFiles, updatedBy }) => {
      isRemoteUpdateRef.current = true;
      setFiles(incomingFiles);
      setActivityBanner(`${updatedBy} syncing changes...`);
    });

    socket.on('language-update', ({ language: incomingLang, updatedBy }) => {
      setLanguage(incomingLang);
      setActivityBanner(`${updatedBy} switched runtime to ${incomingLang}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeRoom?.roomId, user]);

  return socketRef;
}
