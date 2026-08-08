import { prisma } from '../config/db';

export const obtenerEstadisticas = async () => {

  // ─────────────────────────────────────────────
  // Total de expedientes
  // ─────────────────────────────────────────────

  const totalExpedientes = await prisma.expediente.count();


  // ─────────────────────────────────────────────
  // Expedientes agrupados por estado
  // ─────────────────────────────────────────────

  const expedientesPorEstado = await prisma.expediente.groupBy({
    by: ['estado'],

    _count: {
      id_expediente: true
    }
  });


  // ─────────────────────────────────────────────
  // Expedientes agrupados por materia
  // ─────────────────────────────────────────────

  const expedientesPorMateria = await prisma.expediente.groupBy({
    by: ['materia'],

    _count: {
      id_expediente: true
    }
  });


  // ─────────────────────────────────────────────
  // Citas agrupadas por tipo
  // ─────────────────────────────────────────────

  const citasPorTipo = await prisma.cita.groupBy({
    by: ['tipo_cita'],

    _count: {
      id_cita: true
    }
  });


  // ─────────────────────────────────────────────
  // Usuarios agrupados por rol
  // ─────────────────────────────────────────────

  const usuariosPorRol = await prisma.usuario.groupBy({
    by: ['rol'],

    _count: {
      id_usuario: true
    }
  });


  // ─────────────────────────────────────────────
  // Normalización de roles
  //
  // Permite considerar como un mismo rol:
  // "Abogado" y "abogado"
  // ─────────────────────────────────────────────

  const rolesNormalizados = new Map<string, number>();


  usuariosPorRol.forEach((item) => {

    // Convertimos el rol a minúsculas para
    // comparar los valores sin importar
    // diferencias entre mayúsculas y minúsculas.
    const rolNormalizado = item.rol.toLowerCase();


    // Obtenemos la cantidad actual del rol.
    const cantidadActual =
      rolesNormalizados.get(rolNormalizado) ?? 0;


    // Sumamos la cantidad encontrada.
    rolesNormalizados.set(
      rolNormalizado,
      cantidadActual + item._count.id_usuario
    );

  });


  // ─────────────────────────────────────────────
  // Convertimos los roles normalizados nuevamente
  // al formato utilizado por el frontend.
  // ─────────────────────────────────────────────

  const usuariosPorRolFinal = Array.from(
    rolesNormalizados.entries()
  ).map(([rol, cantidad]) => ({

    rol:
      rol.charAt(0).toUpperCase() +
      rol.slice(1),

    _count: {
      id_usuario: cantidad
    }

  }));


  // ─────────────────────────────────────────────
  // Total de documentos
  // ─────────────────────────────────────────────

  const totalDocumentos =
    await prisma.documento.count();


  // ─────────────────────────────────────────────
  // Resultado final de las estadísticas
  // ─────────────────────────────────────────────

  return {

    totalExpedientes,

    expedientesPorEstado,

    expedientesPorMateria,

    citasPorTipo,

    usuariosPorRol: usuariosPorRolFinal,

    totalDocumentos

  };

};