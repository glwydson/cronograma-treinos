import mongoose from 'mongoose'

const diaSchema = new mongoose.Schema({
  dia: { type: String, required: true },
  exercicios: [String],
  nota: { type: Boolean, default: false }
}, { _id: false })

const workoutPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  A: [diaSchema],
  B: [diaSchema],
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('WorkoutPlan', workoutPlanSchema)
