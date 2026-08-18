import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

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
      prisma.expediente.count({ 
        where: { 
          estado: { 
            in: ['En proceso', 'Abierto', 'Pendiente', 'En revisión'] 
          } 
        } 
      }), 
      prisma.usuario.count({ where: { rol: 'Abogado', estado: 'Activo' } }),
      prisma.usuario.count({ where: { rol: 'Cliente' } }),
      prisma.expediente.count({ 
        where: { 
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

    // 2.5 Gráfica de Barras (Dinámico hasta mes actual)
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

    const mesActualIndex = hoy.getMonth();
    const todosLosMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses = todosLosMeses.slice(0, mesActualIndex + 1);

    const abiertos = new Array(mesActualIndex + 1).fill(0);
    const cerrados = new Array(mesActualIndex + 1).fill(0);

    expedientesDelAno.forEach(exp => {
      const mesIndex = exp.fecha_apertura.getMonth(); 
      
      if (mesIndex <= mesActualIndex) {
        abiertos[mesIndex]++;
        
        if (exp.estado === 'Resuelto' || exp.estado === 'Finalizado' || exp.estado === 'Cerrado') {
          cerrados[mesIndex]++;
        }
      }
    });

    const actividadMensual = { meses, abiertos, cerrados };

    // 3. Tabla: Expedientes Recientes (SE AGREGA PARTES_INVOLUCRADAS)
    const expedientesRecientes = await prisma.expediente.findMany({
      take: 4,
      orderBy: { fecha_apertura: 'desc' },
      include: {
        partes_involucradas: true, // 👈 AQUÍ: Permite encontrar a "Florería Lopez" (demandante)
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
        actividadMensual
      },
      expedientesRecientes,
      proximasCitas
    });

  } catch (error) {
    console.error('Error al cargar el dashboard de administrador:', error);
    res.status(500).json({ msg: 'Error interno del servidor al cargar el dashboard.' });
  }
};

export const getAbogadoDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.usuario?.id_usuario;
    if (!userId) {
      return res.status(401).json({ msg: 'Usuario no autenticado.' });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const currentYear = hoy.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // 1. KPIs
    const [
      expedientesActivos,
      audienciasSemana,
      casosResueltos,
      nuevosMes
    ] = await Promise.all([
      prisma.expediente.count({ 
        where: { 
          estado: { in: ['En proceso', 'Abierto', 'Pendiente', 'En revisión'] },
          equipo: { some: { id_usuario: userId } }
        } 
      }),
      prisma.cita.count({
        where: {
          fecha: { 
            gte: hoy, 
            lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
          },
          expediente: { equipo: { some: { id_usuario: userId } } }
        }
      }),
      prisma.expediente.count({ 
        where: { 
          estado: { in: ['Finalizado', 'Resuelto', 'Cerrado', 'Archivado'] },
          equipo: { some: { id_usuario: userId } },
          fecha_apertura: { gte: startOfYear, lte: endOfYear }
        } 
      }),
      prisma.expediente.count({
        where: {
          equipo: { some: { id_usuario: userId } },
          fecha_apertura: {
            gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
            lte: hoy
          }
        }
      })
    ]);

    const documentosRevision = 0; 

    // 2. Gráfica de Dona: Materias
    const expedientesPorMateria = await prisma.expediente.groupBy({
      by: ['materia'],
      where: { equipo: { some: { id_usuario: userId } } },
      _count: { materia: true }
    });

    // 3. Gráfica de Barras: Actividad Mensual
    const expedientesDelAno = await prisma.expediente.findMany({
      where: {
        equipo: { some: { id_usuario: userId } },
        fecha_apertura: { gte: startOfYear, lte: endOfYear }
      },
      select: { fecha_apertura: true, estado: true }
    });

    const mesActualIndex = hoy.getMonth();
    const todosLosMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses = todosLosMeses.slice(0, mesActualIndex + 1);

    const abiertos = new Array(mesActualIndex + 1).fill(0);
    const cerrados = new Array(mesActualIndex + 1).fill(0);

    expedientesDelAno.forEach(exp => {
      const mesIndex = exp.fecha_apertura.getMonth(); 
      if (mesIndex <= mesActualIndex) {
        abiertos[mesIndex]++;
        if (['Resuelto', 'Finalizado', 'Cerrado'].includes(exp.estado)) {
          cerrados[mesIndex]++;
        }
      }
    });

    const actividadMensual = { meses, abiertos, cerrados };

    // 4. Tablas: Recientes (SE AGREGA PARTES_INVOLUCRADAS Y EQUIPO)
    const expedientesRecientes = await prisma.expediente.findMany({
      take: 5,
      where: { equipo: { some: { id_usuario: userId } } },
      orderBy: { fecha_apertura: 'desc' },
      include: {
        partes_involucradas: true, // 👈 AQUÍ: Agregado
        cliente: { select: { nombre: true } },
        equipo: {
          where: { rol_en_caso: 'Abogado' },
          include: {
            user: { select: { nombre: true } }
          }
        }
      }
    });

    const proximasCitas = await prisma.cita.findMany({
      take: 5,
      where: { 
        fecha: { gte: hoy },
        expediente: { equipo: { some: { id_usuario: userId } } }
      },
      orderBy: { fecha: 'asc' },
      include: {
        expediente: { select: { numero_expediente: true } }
      }
    });

    // 5. Enviar Respuesta
    res.status(200).json({
      kpis: {
        expedientesActivos,
        audienciasSemana,
        documentosRevision,
        casosResueltos,
        nuevosMes,
        resueltosAnio: casosResueltos
      },
      graficas: {
        expedientesPorMateria,
        actividadMensual 
      },
      expedientesRecientes,
      proximasCitas
    });

  } catch (error) {
    console.error('Error al cargar el dashboard del abogado:', error);
    res.status(500).json({ msg: 'Error interno del servidor al cargar tu panel.' });
  }
};