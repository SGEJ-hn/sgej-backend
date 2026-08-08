import { prisma } from '../config/db';

export const obtenerEstadisticas = async () => {

  // Total de expedientes
  const totalExpedientes = await prisma.expediente.count();

  // Expedientes agrupados por estado
  const expedientesPorEstado = await prisma.expediente.groupBy({
    by: ['estado'],
    _count: {
      id_expediente: true
    }
  });

  // Expedientes agrupados por materia
  const expedientesPorMateria = await prisma.expediente.groupBy({
    by: ['materia'],
    _count: {
      id_expediente: true
    }
  });

  // Citas agrupadas por tipo
  const citasPorTipo = await prisma.cita.groupBy({
    by: ['tipo_cita'],
    _count: {
      id_cita: true
    }
  });

  // Usuarios agrupados por rol
  const usuariosPorRol = await prisma.usuario.groupBy({
    by: ['rol'],
    _count: {
      id_usuario: true
    }
  });

  // Total de documentos
  const totalDocumentos = await prisma.documento.count();

  return {
    totalExpedientes,

    expedientesPorEstado,

    expedientesPorMateria,

    citasPorTipo,

    usuariosPorRol,

    totalDocumentos
  };
};