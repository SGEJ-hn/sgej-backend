import { prisma } from '../config/db';

// Obtener citas según el usuario
export const obtenerCitas = async (
  idUsuario: string,
  rol: string
) => {

  // Normalizar rol
  const rolNormalizado = rol
    ?.trim()
    .toLowerCase();

  // Administrador ve todas las citas
  if (
    rolNormalizado === 'administrador' ||
    rolNormalizado === 'admin'
  ) {

    return await prisma.cita.findMany({
      include: {
        expediente: true,
        participantes: true
      },
      orderBy: {
        fecha: 'asc'
      }
    });

  }

  // Cliente ve citas de sus expedientes
  if (rolNormalizado === 'cliente') {

    return await prisma.cita.findMany({
      where: {
        expediente: {
          id_cliente: idUsuario
        }
      },
      include: {
        expediente: true,
        participantes: true
      },
      orderBy: {
        fecha: 'asc'
      }
    });

  }

  // Abogado y Paralegal ven citas asignadas
  if (
    rolNormalizado === 'abogado' ||
    rolNormalizado === 'paralegal'
  ) {

    return await prisma.cita.findMany({
      where: {
        expediente: {
          equipo: {
            some: {
              id_usuario: idUsuario
            }
          }
        }
      },
      include: {
        expediente: true,
        participantes: true
      },
      orderBy: {
        fecha: 'asc'
      }
    });

  }

  // Rol no reconocido
  return [];
};


// Obtener cita por ID
export const obtenerCitaPorId = async (
  id: string,
  idUsuario: string,
  rol: string
) => {

  // Normalizar rol
  const rolNormalizado = rol
    ?.trim()
    .toLowerCase();

  // Administrador puede ver cualquier cita
  if (
    rolNormalizado === 'administrador' ||
    rolNormalizado === 'admin'
  ) {

    return await prisma.cita.findUnique({
      where: {
        id_cita: id
      },
      include: {
        expediente: true,
        participantes: true
      }
    });

  }

  // Cliente solo ve citas de sus expedientes
  if (rolNormalizado === 'cliente') {

    return await prisma.cita.findFirst({
      where: {
        id_cita: id,
        expediente: {
          id_cliente: idUsuario
        }
      },
      include: {
        expediente: true,
        participantes: true
      }
    });

  }

  // Abogado y Paralegal solo ven citas asignadas
  if (
    rolNormalizado === 'abogado' ||
    rolNormalizado === 'paralegal'
  ) {

    return await prisma.cita.findFirst({
      where: {
        id_cita: id,
        expediente: {
          equipo: {
            some: {
              id_usuario: idUsuario
            }
          }
        }
      },
      include: {
        expediente: true,
        participantes: true
      }
    });

  }

  return null;
};


// Crear cita
export const crearCita = async (
  data: any,
  idAutor: string // 👈 Recibimos el autor
) => {
  // Usamos una transacción para asegurar que ambas cosas se guarden juntas
  return await prisma.$transaction(async (tx) => {
    // 1. Creamos la cita
    const nuevaCita = await tx.cita.create({
      data: {
        id_expediente: data.id_expediente || null,
        titulo: data.titulo,
        tipo_cita: data.tipo_cita,
        lugar_sala: data.lugar_sala,
        fecha: new Date(data.fecha),
        hora_inicio: new Date(`1970-01-01T${data.hora_inicio}`),
        duracion_estimada: data.duracion_estimada || null,
        notas_recordatorio: data.notas_recordatorio || null,
        recordatorio_automatico: data.recordatorio_automatico ?? true
      }
    });

    // 2. Si la cita pertenece a un expediente, registramos el historial
    if (nuevaCita.id_expediente) {
      await tx.historialExpediente.create({
        data: {
          id_expediente: nuevaCita.id_expediente,
          id_autor: idAutor,
          categoria_evento: 'Citas', // Puedes cambiarlo a 'Cita' si lo prefieres
          titulo_evento: 'Nueva cita programada',
          descripcion: `Se programó: ${nuevaCita.tipo_cita} - "${nuevaCita.titulo}" en ${nuevaCita.lugar_sala}.`,
        }
      });
    }

    return nuevaCita;
  });
};


// Actualizar cita
export const actualizarCita = async (
  id: string,
  data: any,
  idAutor: string // 👈 Recibimos el autor
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizamos la cita
    const citaActualizada = await tx.cita.update({
      where: { id_cita: id },
      data: {
        id_expediente: data.id_expediente || null,
        titulo: data.titulo,
        tipo_cita: data.tipo_cita,
        lugar_sala: data.lugar_sala,
        ...(data.fecha && { fecha: new Date(data.fecha) }),
        ...(data.hora_inicio && { hora_inicio: new Date(`1970-01-01T${data.hora_inicio}`) }),
        duracion_estimada: data.duracion_estimada,
        notas_recordatorio: data.notas_recordatorio,
        recordatorio_automatico: data.recordatorio_automatico
      }
    });

    // 2. Registramos la edición en el historial
    if (citaActualizada.id_expediente) {
      await tx.historialExpediente.create({
        data: {
          id_expediente: citaActualizada.id_expediente,
          id_autor: idAutor,
          categoria_evento: 'Citas',
          titulo_evento: 'Cita actualizada',
          descripcion: `Se modificaron los detalles de la cita: "${citaActualizada.titulo}".`,
        }
      });
    }

    return citaActualizada;
  });
};


// Eliminar cita
export const eliminarCita = async (
  id: string,
  idAutor: string // 👈 Recibimos el autor
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Buscamos la cita PRIMERO para obtener su id_expediente y título
    const citaActual = await tx.cita.findUnique({
      where: { id_cita: id }
    });

    if (!citaActual) throw new Error('Cita no encontrada');

    // 2. Eliminamos la cita
    const citaEliminada = await tx.cita.delete({
      where: { id_cita: id }
    });

    // 3. Registramos la eliminación en el historial
    if (citaActual.id_expediente) {
      await tx.historialExpediente.create({
        data: {
          id_expediente: citaActual.id_expediente,
          id_autor: idAutor,
          categoria_evento: 'Citas',
          titulo_evento: 'Cita cancelada',
          descripcion: `Se canceló la cita: "${citaActual.titulo}".`,
        }
      });
    }

    return citaEliminada;
  });
};