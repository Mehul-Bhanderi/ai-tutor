import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReviewMessages,
  buildHintMessages,
  MAX_HINT_LEVEL,
} from '../src/prompts/tutor.js';

const exercise = {
  title: 'Sum of even numbers',
  language: 'javascript',
  prompt: 'Write a function that sums the even numbers.',
  requirements: ['Handle an empty array', 'Do not mutate the input'],
};

const code = 'function sumOfEvens(n) { return 0; }';

test('review prompt carries the exercise, requirements and the code', () => {
  const [system, user] = buildReviewMessages({ exercise, code });

  assert.equal(system.role, 'system');
  assert.equal(user.role, 'user');

  assert.match(user.content, /Sum of even numbers/);
  assert.match(user.content, /Handle an empty array/);
  assert.match(user.content, /Do not mutate the input/);
  assert.ok(user.content.includes(code));
});

test('review prompt forbids handing over corrected code', () => {
  const [system] = buildReviewMessages({ exercise, code });

  assert.match(system.content, /Do NOT write corrected code/);
  assert.match(system.content, /let them work out the change/);
});

test('hint levels escalate and are distinguishable from each other', () => {
  const prompts = [1, 2, 3, 4].map(
    (level) => buildHintMessages({ exercise, code, level })[0].content
  );

  // Level 1 is a nudge; the top of the ladder is allowed to give the answer.
  assert.match(prompts[0], /ONE nudge/);
  assert.match(prompts[MAX_HINT_LEVEL - 1], /working solution/);

  // No two rungs should be identical, or asking again would achieve nothing.
  assert.equal(new Set(prompts).size, prompts.length);
});

test('hint level is clamped into range', () => {
  const tooLow = buildHintMessages({ exercise, code, level: 0 })[0].content;
  const levelOne = buildHintMessages({ exercise, code, level: 1 })[0].content;
  assert.equal(tooLow, levelOne);

  const tooHigh = buildHintMessages({ exercise, code, level: 99 })[0].content;
  const topRung = buildHintMessages({ exercise, code, level: MAX_HINT_LEVEL })[0].content;
  assert.equal(tooHigh, topRung);
});

test('previous hints are included so the model advances instead of repeating', () => {
  const [, user] = buildHintMessages({
    exercise,
    code,
    level: 2,
    previousHints: ['Look at your loop condition.'],
  });

  assert.match(user.content, /Look at your loop condition\./);
  assert.match(user.content, /Do not repeat these/);
});

test('an empty editor is described rather than sent as a blank block', () => {
  const [, user] = buildHintMessages({ exercise, code: '', level: 1 });
  assert.match(user.content, /they have not written anything yet/);
});
