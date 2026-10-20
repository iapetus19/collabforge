import * as roomService from './room.service.js';

export const create = async (req, res) => {
  const room = await roomService.createRoom({
    name: req.body.name,
    language: req.body.language,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: { room },
  });
};

export const listMyRooms = async (req, res) => {
  const rooms = await roomService.getUserRooms(req.user.id);
  res.status(200).json({
    success: true,
    data: { rooms },
  });
};

export const getByRoomId = async (req, res) => {
  const room = await roomService.getRoomByRoomId(req.params.roomId);
  res.status(200).json({
    success: true,
    data: { room },
  });
};

export const saveCode = async (req, res) => {
  const room = await roomService.updateRoomState(req.params.roomId, req.body);
  res.status(200).json({
    success: true,
    data: { room },
  });
};
