import mongoose from 'mongoose'
import crypto from 'crypto'

const circleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
  },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Circle', circleSchema)
