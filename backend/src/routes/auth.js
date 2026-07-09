import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' })
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'Email já cadastrado' })
    }

    const hashed = await bcrypt.hash(password, 12)
    await User.create({ name, email, password: hashed })

    return res.status(201).json({ message: 'Usuário criado com sucesso' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' })
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ message: 'Email ou senha inválidos' })
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

export default router
