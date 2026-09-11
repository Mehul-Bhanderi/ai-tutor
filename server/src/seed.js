import 'dotenv/config';
import mongoose from 'mongoose';
import { Exercise } from './models/Exercise.js';

const exercises = [
  {
    slug: 'sum-of-evens',
    title: 'Sum of even numbers',
    language: 'javascript',
    difficulty: 'beginner',
    topics: ['arrays', 'iteration'],
    prompt:
      'Write a function `sumOfEvens(numbers)` that returns the sum of every even number in the array. An empty array should return 0.',
    requirements: [
      'Return a number, never undefined',
      'Handle an empty array',
      'Ignore odd numbers',
      'Do not mutate the input array',
    ],
    starterCode: `function sumOfEvens(numbers) {
  // your code here
}
`,
  },
  {
    slug: 'group-by-key',
    title: 'Group objects by key',
    language: 'javascript',
    difficulty: 'intermediate',
    topics: ['objects', 'reduce'],
    prompt:
      'Write `groupBy(items, key)` that returns an object mapping each distinct value of `key` to an array of the items holding that value. For example, grouping `[{type:"a",n:1},{type:"b",n:2},{type:"a",n:3}]` by `"type"` gives `{a:[{type:"a",n:1},{type:"a",n:3}], b:[{type:"b",n:2}]}`.',
    requirements: [
      'Preserve the original order of items within each group',
      'Return an empty object for an empty input array',
      'Do not mutate the input',
      'Items missing the key should be grouped under "undefined"',
    ],
    starterCode: `function groupBy(items, key) {
  // your code here
}
`,
  },
  {
    slug: 'debounce',
    title: 'Implement debounce',
    language: 'javascript',
    difficulty: 'advanced',
    topics: ['closures', 'timers', 'this'],
    prompt:
      'Write `debounce(fn, wait)` that returns a function which delays calling `fn` until `wait` milliseconds have passed since the last time the returned function was invoked. Rapid calls should collapse into a single call using the most recent arguments.',
    requirements: [
      'Only the final call within the wait window should run',
      'Pass the most recent arguments through to fn',
      'Preserve the `this` binding of the caller',
      'Expose a `.cancel()` method that prevents a pending call',
    ],
    starterCode: `function debounce(fn, wait) {
  // your code here
}
`,
  },
  {
    slug: 'balanced-brackets',
    title: 'Balanced brackets',
    language: 'javascript',
    difficulty: 'intermediate',
    topics: ['stacks', 'strings'],
    prompt:
      'Write `isBalanced(input)` that returns true when every bracket in the string is closed in the correct order. Handle `()`, `[]` and `{}`. Characters other than brackets should be ignored.',
    requirements: [
      'Return a boolean',
      'An empty string is balanced',
      'Mismatched pairs such as "([)]" are not balanced',
      'Unclosed brackets are not balanced',
    ],
    starterCode: `function isBalanced(input) {
  // your code here
}
`,
  },
];

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

await mongoose.connect(uri);

for (const exercise of exercises) {
  await Exercise.findOneAndUpdate({ slug: exercise.slug }, exercise, {
    upsert: true,
    new: true,
  });
  console.log(`seeded ${exercise.slug}`);
}

console.log(`\n${exercises.length} exercises ready`);
await mongoose.disconnect();
