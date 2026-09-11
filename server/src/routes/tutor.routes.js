import { Router } from 'express';
import { Exercise } from '../models/Exercise.js';
import { Attempt } from '../models/Attempt.js';
import { requireAuth } from '../middleware/auth.js';
import { getProvider, resolveModel, listProviders } from '../llm/index.js';
import { buildReviewMessages, buildHintMessages, MAX_HINT_LEVEL } from '../prompts/tutor.js';

const router = Router();

router.use(requireAuth);

router.get('/providers', (req, res) => {
  const provider = getProvider();
  res.json({
    available: listProviders(),
    active: provider.name,
    model: resolveModel(provider),
    maxHintLevel: MAX_HINT_LEVEL,
  });
});

router.get('/exercises', async (req, res, next) => {
  try {
    const exercises = await Exercise.find()
      .select('slug title language difficulty topics')
      .sort({ difficulty: 1, title: 1 });

    // Surface the learner's progress alongside the catalogue so the UI can
    // show it without a second round trip.
    const attempts = await Attempt.find({ user: req.user._id }).select('exercise solved hintLevel');
    const byExercise = new Map(attempts.map((a) => [a.exercise.toString(), a]));

    res.json({
      exercises: exercises.map((exercise) => ({
        ...exercise.toObject(),
        progress: byExercise.get(exercise._id.toString())
          ? {
              solved: byExercise.get(exercise._id.toString()).solved,
              hintLevel: byExercise.get(exercise._id.toString()).hintLevel,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Returns the exercise plus this learner's attempt, creating the attempt on first visit. */
router.get('/exercises/:slug', async (req, res, next) => {
  try {
    const exercise = await Exercise.findOne({ slug: req.params.slug });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    let attempt = await Attempt.findOne({ user: req.user._id, exercise: exercise._id });
    if (!attempt) {
      attempt = await Attempt.create({
        user: req.user._id,
        exercise: exercise._id,
        code: exercise.starterCode,
      });
    }

    res.json({ exercise, attempt });
  } catch (err) {
    next(err);
  }
});

/** Saves work in progress without asking for feedback. */
router.put('/exercises/:slug/code', async (req, res, next) => {
  try {
    const exercise = await Exercise.findOne({ slug: req.params.slug });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    const attempt = await Attempt.findOneAndUpdate(
      { user: req.user._id, exercise: exercise._id },
      { code: req.body.code ?? '', ...(req.body.solved !== undefined && { solved: req.body.solved }) },
      { new: true, upsert: true }
    );

    res.json({ attempt });
  } catch (err) {
    next(err);
  }
});

router.post('/exercises/:slug/reset', async (req, res, next) => {
  try {
    const exercise = await Exercise.findOne({ slug: req.params.slug });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    const attempt = await Attempt.findOneAndUpdate(
      { user: req.user._id, exercise: exercise._id },
      { code: exercise.starterCode, hintLevel: 0, solved: false, feedback: [] },
      { new: true, upsert: true }
    );

    res.json({ attempt });
  } catch (err) {
    next(err);
  }
});

/**
 * Streams either a code review or the next hint.
 *
 * `kind=hint` advances the learner's hint level by one and caps at the top of
 * the ladder, so the full solution only arrives after repeated asking.
 */
router.post('/exercises/:slug/feedback', async (req, res, next) => {
  try {
    const { code = '', kind = 'review' } = req.body;
    if (!['review', 'hint'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be "review" or "hint"' });
    }

    const exercise = await Exercise.findOne({ slug: req.params.slug });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    if (kind === 'review' && !code.trim()) {
      return res.status(400).json({ error: 'Write some code before asking for a review' });
    }

    const attempt = await Attempt.findOneAndUpdate(
      { user: req.user._id, exercise: exercise._id },
      { code },
      { new: true, upsert: true }
    );

    let level;
    if (kind === 'hint') {
      level = Math.min(attempt.hintLevel + 1, MAX_HINT_LEVEL);
      attempt.hintLevel = level;
    }

    const messages =
      kind === 'review'
        ? buildReviewMessages({ exercise, code })
        : buildHintMessages({ exercise, code, level, previousHints: attempt.hintsGiven() });

    const provider = getProvider();
    const model = resolveModel(provider);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send('start', { kind, level, maxLevel: MAX_HINT_LEVEL, provider: provider.name, model });

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    let text = '';
    try {
      for await (const delta of provider.streamChat({
        messages,
        model,
        temperature: 0.4, // Lower than chat: feedback should be consistent, not creative.
        signal: controller.signal,
      })) {
        text += delta;
        send('delta', { delta });
      }
    } catch (err) {
      if (err.name !== 'AbortError') send('error', { message: err.message });
    }

    if (text) {
      attempt.feedback.push({
        kind,
        level,
        content: text,
        codeSnapshot: code,
        model,
        provider: provider.name,
      });
    }
    await attempt.save();

    send('done', { hintLevel: attempt.hintLevel });
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
