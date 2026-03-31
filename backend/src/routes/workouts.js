import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import WorkoutPlan from '../models/WorkoutPlan.js'

const router = Router()
router.use(protect)

const treinosIniciais = {
  A: [
    { dia: 'Segunda-feira', exercicios: ['Supino Inclinado', 'Supino Reto', 'Voador', 'Dumbbell Press', 'Elevação Frontal'] },
    { dia: 'Terça-feira', exercicios: ['Agachamento', 'Afundo', 'Adutora', 'Extensora'] },
    { dia: 'Quarta-feira', exercicios: ['Puxada Alta Neutra', 'Remada Unilateral', 'Pulldown', 'Voador Invertido', 'Barra Fixa'] },
    { dia: 'Quinta-feira', exercicios: ['Flexora (cadeira)', 'Mesa Flexora', 'Stiff', 'Panturrilha', 'Abdutora'] },
    { dia: 'Sexta-feira', exercicios: ['Elevação Lateral', 'Desenvolvimento', 'Tríceps Testa', 'Tríceps Francês', 'Rosca Martelo', 'Rosca Scott'] },
    { dia: 'Sábado', exercicios: ['Descanso ativo'], nota: true },
    { dia: 'Domingo', exercicios: ['Corrida com a Bibia 🏃‍♂️'], nota: true }
  ],
  B: [
    { dia: 'Segunda-feira', exercicios: ['Hack ou Smith', 'Búlgaro', 'Adutora', 'Extensora'] },
    { dia: 'Terça-feira', exercicios: ['Puxada Alta Triângulo', 'Remada Máquina', 'Puxada Invertida', 'Rosca Martelo', 'Rosca Scott'] },
    { dia: 'Quarta-feira', exercicios: ['Panturrilha Sentada', 'Elevação Lateral', 'Elevação Frontal', 'Desenvolvimento', 'Cardio 2h'] },
    { dia: 'Quinta-feira', exercicios: ['Stiff', 'Flexora', 'Elevação Pélvica', 'Polia Cruzada', 'Abdômen'] },
    { dia: 'Sexta-feira', exercicios: ['Supino Inclinado', 'Supino Reto', 'Voador / Crucifixo', 'Tríceps Polia', 'Tríceps Francês'] },
    { dia: 'Sábado', exercicios: ['Descanso ativo'], nota: true },
    { dia: 'Domingo', exercicios: ['Corrida com Ollie 🐕'], nota: true }
  ]
}

router.get('/', async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({ userId: req.user.id })
    if (!plan) return res.json(treinosIniciais)
    return res.json({ A: plan.A, B: plan.B })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

router.put('/', async (req, res) => {
  try {
    const { A, B } = req.body
    const plan = await WorkoutPlan.findOneAndUpdate(
      { userId: req.user.id },
      { A, B, updatedAt: new Date() },
      { upsert: true, new: true }
    )
    return res.json({ A: plan.A, B: plan.B })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno' })
  }
})

export default router
