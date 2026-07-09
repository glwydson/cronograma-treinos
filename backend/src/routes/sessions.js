import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import WorkoutSession from '../models/WorkoutSession.js'

const router = Router()
router.use(protect)

router.post('/', async (req, res) => {
  try {
    const { tipo, data, iniciadoEm, finalizadoEm, duracaoSegundos, exerciciosFeitos, exerciciosTotais } = req.body
    if (!tipo || !data || !iniciadoEm || !finalizadoEm) {
      return res.status(400).json({ message: 'Dados incompletos' })
    }
    const session = await WorkoutSession.create({
      userId: req.user.id, tipo, data,
      iniciadoEm: new Date(iniciadoEm),
      finalizadoEm: new Date(finalizadoEm),
      duracaoSegundos: Number(duracaoSegundos) || 0,
      exerciciosFeitos: Number(exerciciosFeitos) || 0,
      exerciciosTotais: Number(exerciciosTotais) || 0
    })
    return res.status(201).json(session)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/', async (req, res) => {
  try {
    const sessions = await WorkoutSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 }).limit(100)
    return res.json(sessions)
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const { period = 'week' } = req.query
    const now = new Date()
    let start

    if (period === 'week') {
      const day = now.getDay()
      const diff = (day === 0 ? -6 : 1 - day)
      start = new Date(now)
      start.setDate(now.getDate() + diff)
      start.setHours(0, 0, 0, 0)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const count = await WorkoutSession.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: start }
    })

    return res.json({ period, count, since: start })
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export default router
