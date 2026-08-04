import { Router } from 'express';

import {
  getCitas,
  getCitaPorId,
  postCita,
  putCita,
  deleteCita
} from '../controllers/cita.controller';

import {
  verificarToken,
  soloAdministrador
} from '../middlewares/auth';

const router = Router();

// Ver citas del usuario
router.get(
  '/',
  verificarToken,
  getCitas
);

// Ver una cita
router.get(
  '/:id',
  verificarToken,
  getCitaPorId
);

// Crear cita
router.post(
  '/',
  verificarToken,
  soloAdministrador,
  postCita
);

// Editar cita
router.put(
  '/:id',
  verificarToken,
  soloAdministrador,
  putCita
);

// Eliminar cita
router.delete(
  '/:id',
  verificarToken,
  soloAdministrador,
  deleteCita
);

export default router;