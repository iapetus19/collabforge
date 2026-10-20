import logger from '../../shared/logger/winston.js';

// Map<roomId, { users: Map<socketId, { id, username, color }>, code?: string, language?: string }>
const activeRooms = new Map();

const USER_COLORS = [
  '#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6'
];

export const registerSocketHandlers = (io, socket) => {
  const user = socket.user;

  socket.on('join-room', ({ roomId, initialCode, initialLanguage }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.currentRoomId = roomId;

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        users: new Map(),
        code: initialCode ?? undefined,
        language: initialLanguage ?? undefined,
      });
    }

    const roomState = activeRooms.get(roomId);
    if (roomState.code === undefined && typeof initialCode === 'string') {
      roomState.code = initialCode;
    }
    if (roomState.language === undefined && initialLanguage) {
      roomState.language = initialLanguage;
    }

    const color = USER_COLORS[roomState.users.size % USER_COLORS.length];
    roomState.users.set(socket.id, {
      socketId: socket.id,
      id: user.id,
      username: user.username,
      color,
    });

    const participants = Array.from(roomState.users.values());

    // Send latest in-memory code/language to the newly joined client so they are immediately in sync
    socket.emit('room-sync', {
      code: roomState.code,
      language: roomState.language,
      participants,
    });

    // Notify everyone in the room of updated participant list
    io.to(roomId).emit('participants-update', {
      participants,
      joinedUser: user.username,
    });

    logger.info(`User ${user.username} joined room ${roomId}`);
  });

  socket.on('code-change', ({ roomId, code }) => {
    if (!roomId || typeof code !== 'string') return;

    const roomState = activeRooms.get(roomId);
    if (roomState) {
      roomState.code = code;
    }

    socket.to(roomId).emit('code-update', {
      code,
      updatedBy: user.username,
    });
  });

  socket.on('language-change', ({ roomId, language }) => {
    if (!roomId || !language) return;

    const roomState = activeRooms.get(roomId);
    if (roomState) {
      roomState.language = language;
    }

    socket.to(roomId).emit('language-update', {
      language,
      updatedBy: user.username,
    });
  });

  socket.on('cursor-move', ({ roomId, position }) => {
    if (!roomId || !position) return;
    socket.to(roomId).emit('cursor-update', {
      socketId: socket.id,
      username: user.username,
      position,
    });
  });

  socket.on('disconnect', () => {
    const roomId = socket.currentRoomId;
    if (!roomId || !activeRooms.has(roomId)) return;

    const roomState = activeRooms.get(roomId);
    roomState.users.delete(socket.id);

    const participants = Array.from(roomState.users.values());
    io.to(roomId).emit('participants-update', {
      participants,
      leftUser: user.username,
    });

    if (roomState.users.size === 0) {
      activeRooms.delete(roomId);
    }

    logger.info(`User ${user.username} left room ${roomId}`);
  });
};
