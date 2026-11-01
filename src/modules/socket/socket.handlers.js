import logger from '../../shared/logger/winston.js';

// Map<roomId, { hostUserId, hostSocketId, approvedUserIds: Set, approvedSocketIds: Set, users: Map, files: Array, language: String }>
const activeRooms = new Map();
const USER_COLORS = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'];

export const registerSocketHandlers = (io, socket) => {
  const user = socket.user || {};
  const currentUserId = String(user.id || user._id || socket.id);

  socket.on('request-join', ({ roomId, ownerId }) => {
    if (!roomId) return;
    const roomState = activeRooms.get(roomId);
    const roomOwnerId = ownerId ? String(ownerId._id || ownerId) : null;

    // 1. If room is not in memory yet, the first user entering initializes it as Host
    if (!roomState) {
      socket.emit('join-approved');
      return;
    }

    // Check if the host currently has a live socket in the room
    const hostEntry =
      roomState.users.get(roomState.hostSocketId) ||
      Array.from(roomState.users.values()).find(
        (u) => String(u.id) === String(roomState.hostUserId)
      );
    const hostSocket = hostEntry ? io.sockets.sockets.get(hostEntry.socketId) : null;

    // 2. If there is NO active host currently connected (e.g. host just refreshed the page)
    // and this user is the host/owner or was previously approved, let them right back in
    if (
      !hostSocket &&
      (currentUserId === String(roomState.hostUserId) ||
        (roomOwnerId && currentUserId === roomOwnerId) ||
        roomState.approvedUserIds.has(currentUserId))
    ) {
      roomState.approvedUserIds.add(currentUserId);
      roomState.approvedSocketIds.add(socket.id);
      socket.emit('join-approved');
      return;
    }

    // 3. If this exact socket is already approved, or if this returning guest (different userId from host) refreshed
    if (
      roomState.approvedSocketIds.has(socket.id) ||
      (currentUserId !== String(roomState.hostUserId) &&
        roomState.approvedUserIds.has(currentUserId))
    ) {
      roomState.approvedSocketIds.add(socket.id);
      socket.emit('join-approved');
      return;
    }

    // 4. Otherwise, prompt the active Host socket for approval!
    if (hostSocket && hostSocket.id !== socket.id) {
      hostSocket.emit('pending-join-request', {
        guestSocketId: socket.id,
        guestUserId: currentUserId,
        username: user.username || 'Collaborator',
      });
      socket.emit('waiting-for-approval');
    } else {
      // Fallback if host is offline
      roomState.approvedUserIds.add(currentUserId);
      roomState.approvedSocketIds.add(socket.id);
      socket.emit('join-approved');
    }
  });

  socket.on('host-decision', ({ guestSocketId, guestUserId, approved, roomId }) => {
    const guestSocket = io.sockets.sockets.get(guestSocketId);
    if (!guestSocket) return;

    const roomState = activeRooms.get(roomId);
    if (approved) {
      if (roomState) {
        if (guestUserId) roomState.approvedUserIds.add(String(guestUserId));
        roomState.approvedSocketIds.add(guestSocketId);
      }
      guestSocket.emit('join-approved');
    } else {
      guestSocket.emit('join-rejected');
    }
  });

  socket.on('join-room', ({ roomId, initialFiles, initialLanguage }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.currentRoomId = roomId;

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        hostUserId: currentUserId,
        hostSocketId: socket.id,
        approvedUserIds: new Set([currentUserId]),
        approvedSocketIds: new Set([socket.id]),
        users: new Map(),
        files: initialFiles ?? [{ name: 'src/main.js', type: 'file', content: '' }],
        language: initialLanguage ?? 'javascript',
      });
    }

    const roomState = activeRooms.get(roomId);
    roomState.approvedUserIds.add(currentUserId);
    roomState.approvedSocketIds.add(socket.id);

    // If the host reconnected after a page refresh, update hostSocketId
    if (currentUserId === String(roomState.hostUserId) && !io.sockets.sockets.get(roomState.hostSocketId)) {
      roomState.hostSocketId = socket.id;
    }

    // Remove any disconnected stale socket entries for the same user
    for (const [sockId, u] of roomState.users.entries()) {
      if (String(u.id) === currentUserId && sockId !== socket.id && !io.sockets.sockets.get(sockId)) {
        roomState.users.delete(sockId);
      }
    }

    const color = USER_COLORS[roomState.users.size % USER_COLORS.length];
    roomState.users.set(socket.id, {
      socketId: socket.id,
      id: currentUserId,
      username: user.username || 'User',
      color,
    });

    const participants = Array.from(roomState.users.values());

    socket.emit('room-sync', {
      files: roomState.files,
      language: roomState.language,
      participants,
    });

    io.to(roomId).emit('participants-update', {
      participants,
      joinedUser: user.username,
    });
    logger.info(`User ${user.username} joined room ${roomId}`);
  });

  socket.on('file-change', ({ roomId, files }) => {
    if (!roomId || !files) return;
    const roomState = activeRooms.get(roomId);
    if (roomState) roomState.files = files;

    socket.to(roomId).emit('file-update', { files, updatedBy: user.username });
  });

  socket.on('language-change', ({ roomId, language }) => {
    if (!roomId || !language) return;
    const roomState = activeRooms.get(roomId);
    if (roomState) roomState.language = language;

    socket.to(roomId).emit('language-update', { language, updatedBy: user.username });
  });

  socket.on('disconnect', () => {
    const roomId = socket.currentRoomId;
    if (!roomId || !activeRooms.has(roomId)) return;

    const roomState = activeRooms.get(roomId);
    roomState.users.delete(socket.id);
    roomState.approvedSocketIds.delete(socket.id);

    const participants = Array.from(roomState.users.values());
    io.to(roomId).emit('participants-update', {
      participants,
      leftUser: user.username,
    });
  });
};
