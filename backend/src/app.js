import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRouter from './routes/auth.js'
import workoutsRouter from './routes/workouts.js'
import sessionsRouter from './routes/sessions.js'
import circlesRouter from './routes/circles.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())
app.use(cors())

app.use('/api/auth', authRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/circles', circlesRouter)
app.get('/api/health', (_req, res) => res.json({ ok: true }))

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err))

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
