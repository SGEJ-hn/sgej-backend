import { Router } from 'express';

import {
    createExpediente,
    getExpedientes,
    getExpediente,
    updateExpediente,
    deleteExpediente,
    asignarUsuarioExpediente,
} from '../controllers/expediente.controller';
import { obtenerHistorialExpediente } from '../controllers/historial.controller';

import { verificarToken } from '../middlewares/auth';
import { audit } from '../middlewares/audit';

const router = Router();

router.post('/', verificarToken, audit, createExpediente);

router.get('/', verificarToken, getExpedientes);

router.get('/:id', verificarToken, getExpediente);
// ─────────────────────────────────────────────
// GET /api/expedientes
// Listar expedientes
// ─────────────────────────────────────────────
router.get(
    '/',
    verificarToken,
    getExpedientes
);

// ─────────────────────────────────────────────
// POST /api/expedientes
// Crear expediente
// ─────────────────────────────────────────────
router.post(
    '/',
    verificarToken,
    audit,
    createExpediente
);

// ─────────────────────────────────────────────
// GET /api/expedientes/:id
// Ver detalle de expediente
// ─────────────────────────────────────────────
router.get(
    '/:id',
    verificarToken,
    getExpediente
);

// ─────────────────────────────────────────────
// PUT /api/expedientes/:id
// Actualizar expediente
// ─────────────────────────────────────────────
router.put(
    '/:id',
    verificarToken,
    audit,
    updateExpediente
);

// ─────────────────────────────────────────────
// DELETE /api/expedientes/:id
// Eliminar expediente
// ─────────────────────────────────────────────
router.delete(
    '/:id',
    verificarToken,
    audit,
    deleteExpediente
);

// ─────────────────────────────────────────────
// POST /api/expedientes/:id/equipo
// Asignar Abogado o Paralegal
// ─────────────────────────────────────────────
router.post(
    '/:id/equipo',
    verificarToken,
    audit,
    asignarUsuarioExpediente
);

router.get('/:id/historial',  obtenerHistorialExpediente);

export default router;