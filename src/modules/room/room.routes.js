import { Router } from 'express';
import * as roomController from './room.controller.js';
import authGuard from '../../shared/middleware/authGuard.js';
import validate from '../../shared/middleware/validate.js';
import { createRoomSchema, updateRoomCodeSchema } from './room.schema.js';

const router = Router();

router.use(authGuard);

router.post('/', validate(createRoomSchema), roomController.create);
router.get('/', roomController.listMyRooms);
router.get('/:roomId', roomController.getByRoomId);
router.patch('/:roomId', validate(updateRoomCodeSchema), roomController.saveCode);

export default router;
