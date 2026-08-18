import { Router } from 'express';
import {
  asignarUsuarioExpediente,
  createExpediente,
  deleteExpediente,
  getExpediente,
  getExpedientes,
  updateExpediente,
} from '../controllers/expediente.controller';
import { obtenerHistorialExpediente } from '../controllers/historial.controller';
import { audit } from '../middlewares/audit';
import { soloAdministrador, verificarToken } from '../middlewares/auth';

const router = Router();

router.get('/', verificarToken, getExpedientes);
router.get('/:id', verificarToken, getExpediente);
router.get('/:id/historial', verificarToken, obtenerHistorialExpediente);
router.post('/', verificarToken, soloAdministrador, audit, createExpediente);
router.put('/:id', verificarToken, soloAdministrador, audit, updateExpediente);
router.delete('/:id', verificarToken, soloAdministrador, audit, deleteExpediente);
router.post('/:id/equipo', verificarToken, soloAdministrador, audit, asignarUsuarioExpediente);

export default router;
