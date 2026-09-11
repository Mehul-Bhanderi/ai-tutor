import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['review', 'hint'], required: true },
    // Only meaningful for hints; tracks how far up the ladder this one was.
    level: { type: Number },
    content: { type: String, required: true },
    codeSnapshot: { type: String },
    model: { type: String },
    provider: { type: String },
  },
  { timestamps: true, _id: true }
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    code: { type: String, default: '' },
    // Persisted so the hint ladder survives a page reload; a learner cannot
    // reset to level 1 just by refreshing.
    hintLevel: { type: Number, default: 0 },
    solved: { type: Boolean, default: false },
    feedback: [feedbackSchema],
  },
  { timestamps: true }
);

// One attempt record per learner per exercise, updated as they iterate.
attemptSchema.index({ user: 1, exercise: 1 }, { unique: true });

attemptSchema.methods.hintsGiven = function hintsGiven() {
  return this.feedback.filter((f) => f.kind === 'hint').map((f) => f.content);
};

export const Attempt = mongoose.model('Attempt', attemptSchema);
