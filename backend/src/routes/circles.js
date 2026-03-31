import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import Circle from '../models/Circle.js'
import WorkoutSession from '../models/WorkoutSession.js'
import User from '../models/User.js'

const router = Router()
router.use(protect)

router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id
    const circle = await Circle.findOne({
      $or: [{ owner: userId }, { members: userId }]
    }).populate('owner', 'name email').populate('members', 'name email')
    if (!circle) return res.json(null)
    return res.json(circle)
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id
    const existing = await Circle.findOne({ $or: [{ owner: userId }, { members: userId }] })
    if (existing) return res.status(409).json({ message: 'Você já está em um círculo' })

    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Nome obrigatório' })

    const circle = await Circle.create({ name, owner: userId, members: [userId] })
    await circle.populate('owner', 'name email')
    await circle.populate('members', 'name email')
    return res.status(201).json(circle)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/join', async (req, res) => {
  try {
    const userId = req.user.id
    const { inviteCode } = req.body
    if (!inviteCode) return res.status(400).json({ message: 'Código obrigatório' })

    const existing = await Circle.findOne({ $or: [{ owner: userId }, { members: userId }] })
    if (existing) return res.status(409).json({ message: 'Você já está em um círculo. Saia primeiro.' })

    const circle = await Circle.findOne({ inviteCode: inviteCode.toUpperCase() })
    if (!circle) return res.status(404).json({ message: 'Código inválido ou círculo não encontrado' })

    if (circle.members.includes(userId)) return res.status(409).json({ message: 'Você já é membro' })

    circle.members.push(userId)
    await circle.save()
    await circle.populate('owner', 'name email')
    await circle.populate('members', 'name email')
    return res.json(circle)
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.post('/leave', async (req, res) => {
  try {
    const userId = req.user.id
    const circle = await Circle.findOne({ $or: [{ owner: userId }, { members: userId }] })
    if (!circle) return res.status(404).json({ message: 'Você não está em nenhum círculo' })

    if (String(circle.owner) === String(userId)) {
      await Circle.deleteOne({ _id: circle._id })
      return res.json({ message: 'Círculo encerrado' })
    }

    circle.members = circle.members.filter(m => String(m) !== String(userId))
    await circle.save()
    return res.json({ message: 'Você saiu do círculo' })
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.get('/:id/stats', async (req, res) => {
  try {
    const { period = 'week' } = req.query
    const circle = await Circle.findById(req.params.id)
      .populate('members', 'name email')
    if (!circle) return res.status(404).json({ message: 'Círculo não encontrado' })

    const isMember = circle.members.some(m => String(m._id) === String(req.user.id)) ||
      String(circle.owner) === String(req.user.id)
    if (!isMember) return res.status(403).json({ message: 'Acesso negado' })

    const memberIds = circle.members.map(m => m._id)
    const now = new Date()
    let dateFilter = {}

    if (period === 'week') {
      const day = now.getDay()
      const diff = (day === 0 ? -6 : 1 - day)
      const start = new Date(now)
      start.setDate(now.getDate() + diff)
      start.setHours(0, 0, 0, 0)
      dateFilter = { createdAt: { $gte: start } }
    } else if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { createdAt: { $gte: start } }
    }

    const counts = await WorkoutSession.aggregate([
      { $match: { userId: { $in: memberIds }, ...dateFilter } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ])

    const recentSessions = await WorkoutSession.find({
      userId: { $in: memberIds },
      ...dateFilter
    }).sort({ createdAt: -1 }).limit(50).lean()

    const ranking = circle.members.map(member => {
      const found = counts.find(c => String(c._id) === String(member._id))
      return {
        user: { id: member._id, name: member.name, email: member.email },
        count: found ? found.count : 0
      }
    }).sort((a, b) => b.count - a.count)

    const membersMap = {}
    circle.members.forEach(m => { membersMap[String(m._id)] = m.name })

    const feed = recentSessions.map(s => ({
      ...s,
      userName: membersMap[String(s.userId)] || 'Usuário'
    }))

    return res.json({ ranking, feed, period, circle: { id: circle._id, name: circle.name, inviteCode: circle.inviteCode } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export default router
