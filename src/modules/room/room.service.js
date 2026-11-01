import Room from './room.model.js';
import AppError from '../../shared/errors/AppError.js';
import ERROR_CODES from '../../shared/errors/errorCodes.js';

export const createRoom = async ({ name, language, userId, files }) => {
  const createData = {
    name,
    language: language || 'javascript',
    owner: userId,
  };

  // Persist the language-specific starter files when provided
  if (Array.isArray(files) && files.length > 0) {
    createData.files = files;
  }

  const room = await Room.create(createData);
  return room;
};

export const getUserRooms = async (userId) => {
  return Room.find({ owner: userId }).sort({ updatedAt: -1 });
};

export const getRoomByRoomId = async (roomId) => {
  const room = await Room.findOne({ roomId }).populate('owner', 'username email');
  if (!room) {
    throw new AppError('Room not found', ERROR_CODES.NOT_FOUND);
  }
  return room;
};

export const updateRoomState = async (roomId, { code, language, files }) => {
  const updateData = {};
  if (typeof code === 'string') updateData.code = code;
  if (language) updateData.language = language;
  if (Array.isArray(files) && files.length > 0) updateData.files = files;

  const room = await Room.findOneAndUpdate(
    { roomId },
    { $set: updateData },
    { new: true }
  );

  if (!room) {
    throw new AppError('Room not found', ERROR_CODES.NOT_FOUND);
  }
  return room;
};
