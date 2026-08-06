import { Router } from 'express';
import {
  createExpediente,
  getExpedientes,
  getExpediente,
  updateExpediente,
  deleteExpediente,
} from '../controllers/expediente.controller';

const router = Router();

// Rutas CRUD para expedientes
router.get('/', getExpedientes);          // Listar todos (con filtros opcionales)
router.post('/', createExpediente);       // Crear nuevo expediente
router.get('/:id', getExpediente);        // Obtener uno por ID
router.put('/:id', updateExpediente);     // Actualizar por ID
router.delete('/:id', deleteExpediente);  // Eliminar por ID

export default router;