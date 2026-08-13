import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // ==========================================
    // NUEVO: Fechas para filtrar el año actual
    // ==========================================
    const currentYear = hoy.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // 1. KPIs (Tarjetas superiores)
    const [
      expedientesActivos,
      abogadosActivos,
      clientesRegistrados,
      casosResueltos
    ] = await Promise.all([
      prisma.expediente.count({ where: { 
          estado: { 
            in: ['En proceso', 'Abierto', 'Pendiente', 'En revisión'] 
          } 
        } 
      }), 
      prisma.usuario.count({ where: { rol: 'Abogado', estado: 'Activo' } }),
      prisma.usuario.count({ where: { rol: 'Cliente' } }),
      prisma.expediente.count({ where: { 
          estado: { 
            in: ['Finalizado', 'Resuelto', 'Cerrado', 'Archivado'] 
          } 
        } 
      }) 
    ]);

    // 2. Gráfica de Dona: Expedientes por Materia
    const expedientesPorMateria = await prisma.expediente.groupBy({
      by: ['materia'],
      _count: { materia: true }
    });

    // ==========================================
    // NUEVO: 2.5 Gráfica de Barras (Dinámico hasta mes actual)
    // ==========================================
    // Traemos los expedientes abiertos este año
    const expedientesDelAno = await prisma.expediente.findMany({
      where: {
        fecha_apertura: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      select: {
        fecha_apertura: true,
        estado: true
      }
    });

    // 1. Obtenemos el índice del mes actual (0 = Enero, 11 = Diciembre)
    const mesActualIndex = hoy.getMonth();

    // 2. Recortamos el arreglo de textos dinámicamente usando slice()
    const todosLosMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses = todosLosMeses.slice(0, mesActualIndex + 1);

    // 3. Creamos los arreglos de datos ajustados exactamente a esa cantidad de meses
    const abiertos = new Array(mesActualIndex + 1).fill(0);
    const cerrados = new Array(mesActualIndex + 1).fill(0);

    // 4. Iteramos y sumamos
    expedientesDelAno.forEach(exp => {
      const mesIndex = exp.fecha_apertura.getMonth(); 
      
      // Filtramos por si hay algún registro erróneo con fecha futura
      if (mesIndex <= mesActualIndex) {
        abiertos[mesIndex]++;
        
        if (exp.estado === 'Resuelto' || exp.estado === 'Finalizado' || exp.estado === 'Cerrado') {
          cerrados[mesIndex]++;
        }
      }
    });

    const actividadMensual = { meses, abiertos, cerrados };
    // 3. Tabla: Expedientes Recientes
    const expedientesRecientes = await prisma.expediente.findMany({
      take: 4,
      orderBy: { fecha_apertura: 'desc' },
      include: {
        cliente: { 
          select: { nombre: true } 
        },
        equipo: {
          where: { rol_en_caso: 'Abogado' }, 
          include: { 
            user: { select: { nombre: true } } 
          }
        }
      }
    });

    // 4. Tabla: Próximas Citas
    const proximasCitas = await prisma.cita.findMany({
      take: 4,
      where: { fecha: { gte: hoy } },
      orderBy: { fecha: 'asc' },
      include: {
        expediente: {
          select: { 
            numero_expediente: true, 
            cliente: { select: { nombre: true } } 
          }
        }
      }
    });

    // 5. Enviamos todo empaquetado en un solo JSON
    res.status(200).json({
      kpis: {
        expedientesActivos,
        abogadosActivos,
        clientesRegistrados,
        casosResueltos
      },
      graficas: {
        expedientesPorMateria,
        actividadMensual // 👈 Enviamos la nueva data aquí
      },
      expedientesRecientes,
      proximasCitas
    });

  } catch (error) {
    console.error('Error al cargar el dashboard de administrador:', error);
    res.status(500).json({ msg: 'Error interno del servidor al cargar el dashboard.' });
  }
};