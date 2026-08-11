import { Router } from 'express';

import {
    createExpediente,
    getExpedientes,
    getExpediente,
    updateExpediente,
    deleteExpediente,
} from '../controllers/expediente.controller';
import { obtenerHistorialExpediente } from '../controllers/historial.controller';

import { verificarToken } from '../middlewares/auth';
import { audit } from '../middlewares/audit';

const router = Router();

router.post('/', verificarToken, audit, createExpediente);

router.get('/', verificarToken, getExpedientes);

router.get('/:id', verificarToken, getExpediente);

router.put('/:id', verificarToken, audit, updateExpediente);

router.delete('/:id', verificarToken, audit, deleteExpediente);

router.get('/:id/historial',  obtenerHistorialExpediente);

export default router;