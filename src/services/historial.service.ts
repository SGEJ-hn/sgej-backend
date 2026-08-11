import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface DatosHistorial {
  id_expediente: string;
  id_autor: string;
  categoria_evento: 'Audiencias' | 'Documentos' | 'Resoluciones' | 'Escritos' | 'Expediente';
  titulo_evento: string;
  descripcion: string;
}

export const registrarEventoHistorial = async (datos: DatosHistorial) => {
  try {
    await prisma.historialExpediente.create({
      data: {
        id_expediente: datos.id_expediente,
        id_autor: datos.id_autor,
        categoria_evento: datos.categoria_evento,
        titulo_evento: datos.titulo_evento,
        descripcion: datos.descripcion,
      },
    });
    
    console.log(`[Historial] Evento registrado: ${datos.titulo_evento}`);
  } catch (error) {
    console.error('[Historial] Error al intentar registrar el evento:', error);
  }
};

// 🌟 NUEVA FUNCIÓN: Obtener entradas del historial por expediente con filtro opcional por categoría
export const obtenerHistorialServicio = async (
  id_expediente: string,
  categoria?: string
) => {
  const dondeFiltro: any = { id_expediente };

  if (categoria && categoria !== 'Todos') {
    dondeFiltro.categoria_evento = categoria;
  }

  return await prisma.historialExpediente.findMany({
    where: dondeFiltro,
    include: {
      autor: {
        select: {
          id_usuario: true,
          nombre: true,
          rol: true,
        },
      },
      expediente: {
        select: {
          numero_expediente: true,
          cliente: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
    orderBy: {
      fecha_modificacion: 'desc',
    },
  });
};