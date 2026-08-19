import { prisma } from '../config/db';

export const obtenerEstadisticas = async (usuario: { id_usuario: string; rol: string }) => {
  
  // Normalizamos el rol para validarlo
  const rolUsuario = usuario.rol.toLowerCase().trim();
  const esAdmin = rolUsuario === 'administrador' || rolUsuario === 'admin';

  // ─────────────────────────────────────────────
  // CONSTRUCCIÓN DE FILTROS (WHERE)
  // ─────────────────────────────────────────────
  
  // Si NO es admin, filtramos los expedientes donde este usuario sea parte del "ExpedienteEquipo"
  const filtroExpediente = esAdmin ? {} : {
    equipo: {
      some: { id_usuario: usuario.id_usuario }
    }
  };

  // Para Citas y Documentos, filtramos a través de la relación con el expediente
  const filtroRelacionado = esAdmin ? {} : {
    expediente: {
      equipo: {
        some: { id_usuario: usuario.id_usuario }
      }
    }
  };

  // ─────────────────────────────────────────────
  // Total de expedientes
  // ─────────────────────────────────────────────
  const totalExpedientes = await prisma.expediente.count({
    where: filtroExpediente
  });

  // ─────────────────────────────────────────────
  // Expedientes agrupados por estado
  // ─────────────────────────────────────────────
  const expedientesPorEstado = await prisma.expediente.groupBy({
    by: ['estado'],
    where: filtroExpediente,
    _count: { id_expediente: true }
  });

  // ─────────────────────────────────────────────
  // Expedientes agrupados por materia
  // ─────────────────────────────────────────────
  const expedientesPorMateria = await prisma.expediente.groupBy({
    by: ['materia'],
    where: filtroExpediente,
    _count: { id_expediente: true }
  });

  // ─────────────────────────────────────────────
  // Citas agrupadas por tipo
  // ─────────────────────────────────────────────
  const citasPorTipo = await prisma.cita.groupBy({
    by: ['tipo_cita'],
    where: filtroRelacionado,
    _count: { id_cita: true }
  });

  // ─────────────────────────────────────────────
  // Total de documentos
  // ─────────────────────────────────────────────
  const totalDocumentos = await prisma.documento.count({
    where: filtroRelacionado
  });

  // ─────────────────────────────────────────────
  // Usuarios agrupados por rol (SOLO PARA ADMIN)
  // ─────────────────────────────────────────────
  let usuariosPorRolFinal: any[] = [];

  if (esAdmin) {
    const usuariosPorRol = await prisma.usuario.groupBy({
      by: ['rol'],
      _count: { id_usuario: true }
    });

    const rolesNormalizados = new Map<string, number>();

    usuariosPorRol.forEach((item) => {
      const rolNormalizado = item.rol.toLowerCase();
      const cantidadActual = rolesNormalizados.get(rolNormalizado) ?? 0;
      rolesNormalizados.set(rolNormalizado, cantidadActual + item._count.id_usuario);
    });

    usuariosPorRolFinal = Array.from(rolesNormalizados.entries()).map(([rol, cantidad]) => ({
      rol: rol.charAt(0).toUpperCase() + rol.slice(1),
      _count: { id_usuario: cantidad }
    }));
  }

  // ─────────────────────────────────────────────
  // Resultado final de las estadísticas
  // ─────────────────────────────────────────────
  return {
    totalExpedientes,
    expedientesPorEstado,
    expedientesPorMateria,
    citasPorTipo,
    usuariosPorRol: usuariosPorRolFinal, // Si es abogado, devolverá un arreglo vacío []
    totalDocumentos
  };
};