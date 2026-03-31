import mongoose from 'mongoose'

const workoutSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, enum: ['A', 'B'], required: true },
  data: { type: String, required: true },
  iniciadoEm: { type: Date, required: true },
  finalizadoEm: { type: Date, required: true },
  duracaoSegundos: { type: Number, required: true },
  exerciciosFeitos: { type: Number, default: 0 },
  exerciciosTotais: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

workoutSessionSchema.index({ userId: 1, createdAt: -1 })
workoutSessionSchema.index({ userId: 1, data: 1 })

export default mongoose.model('WorkoutSession', workoutSessionSchema)
