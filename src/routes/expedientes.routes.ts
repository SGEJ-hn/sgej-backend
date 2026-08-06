import { Router } from 'express';

import {
    createExpediente,
    getExpedientes,
    getExpediente,
    updateExpediente,
    deleteExpediente,
} from '../controllers/expediente.controller';

import { verificarToken } from '../middlewares/auth';
import { audit } from '../middlewares/audit';

const router = Router();

router.get('/', verificarToken, getExpedientes);

router.post('/', verificarToken, audit, createExpediente);

router.get('/:id', verificarToken, getExpediente);

router.put('/:id', verificarToken, audit, updateExpediente);

router.delete('/:id', verificarToken, audit, deleteExpediente);

export default router;