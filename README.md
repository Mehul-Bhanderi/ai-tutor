# AI Coding Tutor

A practice environment where an LLM reviews your code without writing it for you. Exercises open in a Monaco editor, and feedback comes in two forms: a review that names problems but withholds fixes, and hints that escalate only when you ask again.

## The idea

An AI that answers "why doesn't my code work?" with a corrected snippet teaches nothing — the learner copies it and moves on. This app is built around withholding the answer.

**Reviews** point at where a problem is and what kind of problem it is, without providing the fix or restructuring the solution. The system prompt forbids corrected code outright.

**Hints escalate across four rungs**, and each request advances exactly one rung:

| Level | What you get |
|---|---|
| 1 | One nudge, two sentences at most. Names the area, nothing else. |
| 2 | The specific concept you're missing and why your approach falls short. |
| 3 | The approach explained step by step in prose, still not your solution. |
| 4 | The working solution, with the misconception that blocked you called out. |

The level is stored server-side on the attempt, so refreshing the page doesn't reset you to level 1, and previously issued hints are fed back into the prompt with an instruction not to repeat them. Getting the answer takes four deliberate requests.

## Features

**Exercise library** — Seeded with four JavaScript exercises spanning beginner to advanced (array iteration, `reduce`-based grouping, stack-based bracket matching, and implementing `debounce` with `this` binding and a `cancel` method). Each carries explicit requirements that are passed to the reviewer, so feedback is graded against stated criteria rather than the model's taste.

**Monaco editor** — The editor from VS Code, with per-exercise language and syntax highlighting.

**Autosaved attempts** — Code is debounced and saved as you type, one attempt record per learner per exercise. Progress and solved state show in the exercise list.

**Streaming feedback** — Reviews and hints stream token by token over SSE with a Stop button. Aborting propagates an `AbortSignal` to the provider, so cancelling stops the upstream request rather than just hiding output.

**Provider-agnostic LLM layer** — OpenAI, Anthropic or a local Ollama model behind one `streamChat` contract; switching is an environment variable. Feedback runs at a lower temperature than a chat app would, because review quality should be consistent rather than creative.

## Stack

**Backend** — Express, MongoDB with Mongoose, JWT in an HTTP-only cookie, bcryptjs. Providers call `fetch` directly rather than pulling in vendor SDKs.

**Frontend** — React with Vite and `@monaco-editor/react`. The API client reads SSE with a `ReadableStream` reader, since the feedback endpoint is a POST and `EventSource` only issues GETs.

## Layout

```
server/
  src/
    index.js                  app entry, env validation
    prompts/tutor.js          reviewer role and the four-rung hint ladder
    llm/                      provider registry, SSE parser, provider adapters
    models/                   User, Exercise, Attempt (feedback embedded)
    routes/                   auth.routes.js, tutor.routes.js
    seed.js                   loads the exercise library
  test/
    prompts.test.js           ladder escalation, clamping, prompt contents
    llm.test.js               provider contract, SSE chunk-boundary parsing
web/
  src/
    api/client.js             REST client + streaming reader
    pages/Workspace.jsx       editor, brief, actions
    components/               ExerciseList, FeedbackPanel
```

## Running it

Requires Node 20+ and MongoDB.

**Backend**

```bash
cd server
npm install
cp .env.example .env     # set JWT_SECRET and pick an LLM_PROVIDER
npm run seed             # load the exercise library
npm run dev
```

**Frontend**

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

### Running with no API key

`.env.example` defaults to `LLM_PROVIDER=ollama`, which needs no key:

```bash
ollama pull llama3.1
ollama serve
```

For a hosted provider, set `LLM_PROVIDER=openai` or `anthropic` and supply the matching key.

## Tests

```bash
cd server
npm test
```

Thirteen tests covering the hint ladder (escalation, clamping at both ends, no duplicate rungs, prior hints echoed back), the reviewer prompt's no-code constraint, the provider contract, and SSE parsing where events straddle chunk boundaries.

## API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/tutor/providers` | Active provider, model, max hint level |
| `GET` | `/api/tutor/exercises` | Catalogue with per-exercise progress |
| `GET` | `/api/tutor/exercises/:slug` | Exercise plus your attempt |
| `PUT` | `/api/tutor/exercises/:slug/code` | Autosave code, optionally mark solved |
| `POST` | `/api/tutor/exercises/:slug/reset` | Clear code, hints and feedback |
| `POST` | `/api/tutor/exercises/:slug/feedback` | Stream a review or the next hint (SSE) |
