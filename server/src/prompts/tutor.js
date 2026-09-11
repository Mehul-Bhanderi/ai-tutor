/**
 * Prompt construction for the tutor.
 *
 * The guiding rule is that a tutor which hands over working code teaches
 * nothing. Feedback is therefore staged: the review names problems without
 * fixing them, and hints escalate only when the learner asks again. The full
 * solution is reachable, but it takes four deliberate requests to get there.
 */

const REVIEWER_ROLE = `You are a programming tutor reviewing a learner's attempt at an exercise.

Your job is to help them find their own mistakes. Follow these rules strictly:

- Do NOT write corrected code. Do not provide code blocks containing the fix.
- Do NOT restructure their solution for them.
- Point at *where* a problem is and *what kind* of problem it is, and let them work out the change.
- If their approach works but is inefficient or unidiomatic, say so, and name the concept they should read about.
- If their code is correct, say so plainly and mention one thing they could improve. Do not invent faults.
- Be specific about lines and identifiers. "Your loop bound is off" beats "there is a bug".
- Be brief. Three or four short paragraphs at most.`;

const HINT_LADDER = [
  // Level 1
  `Give ONE nudge, at most two sentences. Name the area to look at and nothing more.
Do not say what the fix is. Do not write code.`,

  // Level 2
  `Give a more direct hint, three or four sentences. Name the specific concept or
operation they are missing and why their current approach falls short.
Still no code, and still no complete fix.`,

  // Level 3
  `Explain the approach they should take, step by step, in prose. You may show a
tiny illustrative snippet of an unrelated example, but do NOT write their solution.`,

  // Level 4
  `They have asked repeatedly and are stuck. Provide the working solution with a
clear explanation of each part, and call out the specific misconception that was
blocking them.`,
];

export function buildReviewMessages({ exercise, code }) {
  return [
    { role: 'system', content: REVIEWER_ROLE },
    {
      role: 'user',
      content: [
        `## Exercise: ${exercise.title}`,
        exercise.prompt,
        '',
        exercise.requirements?.length
          ? `## Requirements\n${exercise.requirements.map((r) => `- ${r}`).join('\n')}`
          : '',
        '',
        `## Their attempt (${exercise.language})`,
        '```' + exercise.language,
        code,
        '```',
        '',
        'Review this attempt according to your instructions.',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}

export function buildHintMessages({ exercise, code, level, previousHints = [] }) {
  const clamped = Math.min(Math.max(level, 1), HINT_LADDER.length);

  return [
    {
      role: 'system',
      content: `${REVIEWER_ROLE}\n\n## Current task\n${HINT_LADDER[clamped - 1]}`,
    },
    {
      role: 'user',
      content: [
        `## Exercise: ${exercise.title}`,
        exercise.prompt,
        '',
        `## Their current code (${exercise.language})`,
        '```' + exercise.language,
        code || '(they have not written anything yet)',
        '```',
        '',
        previousHints.length
          ? `## Hints already given\n${previousHints
              .map((h, i) => `${i + 1}. ${h}`)
              .join('\n')}\n\nDo not repeat these. Advance beyond them.`
          : '',
        '',
        `Give hint level ${clamped} of ${HINT_LADDER.length}.`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];
}

export const MAX_HINT_LEVEL = HINT_LADDER.length;
