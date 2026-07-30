import { Router } from 'express';
import {
  createExpediente,
  getExpediente,
  updateExpediente,
  getExpedientes,
} from '../controllers/expediente.controller';

const router = Router();

// Rutas base para expedientes
router.get('/', getExpedientes);
router.post('/', createExpediente);
router.get('/:id', getExpediente);
router.put('/:id', updateExpediente);

export default router;