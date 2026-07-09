import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import WorkoutPlan from '../models/WorkoutPlan.js'

const router = Router()
router.use(protect)

// GET / — lista todos os planos do usuário
router.get('/', async (req, res) => {
  try {
    const plans = await WorkoutPlan.find({ userId: req.user.id }).sort({ createdAt: 1 })
    return res.json(plans)
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

// POST / — criar novo plano
router.post('/', async (req, res) => {
  try {
    const { name, days } = req.body
    if (!name) return res.status(400).json({ message: 'Nome do plano é obrigatório' })
    const plan = await WorkoutPlan.create({ userId: req.user.id, name, days: days || [] })
    return res.status(201).json(plan)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

// PUT /:id — atualizar plano
router.put('/:id', async (req, res) => {
  try {
    const { name, days } = req.body
    const plan = await WorkoutPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, days },
      { new: true }
    )
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado' })
    return res.json(plan)
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

// DELETE /:id — remover plano
router.delete('/:id', async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!plan) return res.status(404).json({ message: 'Plano não encontrado' })
    return res.json({ message: 'Plano removido' })
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export default router
