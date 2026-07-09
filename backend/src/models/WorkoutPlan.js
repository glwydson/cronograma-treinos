import mongoose from 'mongoose'

const diaSchema = new mongoose.Schema({
  dia: { type: String, required: true },
  exercicios: [String],
  nota: { type: Boolean, default: false }
}, { _id: false })

const workoutPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  days: [diaSchema],
  createdAt: { type: Date, default: Date.now }
})

workoutPlanSchema.index({ userId: 1 })

export default mongoose.model('WorkoutPlan', workoutPlanSchema)
