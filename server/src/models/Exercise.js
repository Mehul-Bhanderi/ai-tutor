import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true },
    language: { type: String, required: true, default: 'javascript' },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    topics: [{ type: String }],
    prompt: { type: String, required: true },
    requirements: [{ type: String }],
    starterCode: { type: String, default: '' },
  },
  { timestamps: true }
);

exerciseSchema.index({ difficulty: 1, title: 1 });

export const Exercise = mongoose.model('Exercise', exerciseSchema);
