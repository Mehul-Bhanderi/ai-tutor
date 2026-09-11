import { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { api, streamFeedback } from '../api/client.js';
import { ExerciseList } from '../components/ExerciseList.jsx';
import { FeedbackPanel } from '../components/FeedbackPanel.jsx';

export function Workspace() {
  const [exercises, setExercises] = useState([]);
  const [provider, setProvider] = useState(null);
  const [slug, setSlug] = useState(null);
  const [exercise, setExercise] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [code, setCode] = useState('');
  const [streaming, setStreaming] = useState('');
  const [streamingMeta, setStreamingMeta] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const abortRef = useRef(null);
  const busy = streaming !== '' || abortRef.current !== null;

  const refreshExercises = useCallback(async () => {
    const { exercises: list } = await api.listExercises();
    setExercises(list);
    return list;
  }, []);

  useEffect(() => {
    api.providers().then(setProvider).catch(() => {});
    refreshExercises()
      .then((list) => {
        if (list.length) setSlug(list[0].slug);
      })
      .catch((err) => setError(err.message));
  }, [refreshExercises]);

  useEffect(() => {
    if (!slug) return;

    api
      .getExercise(slug)
      .then(({ exercise: ex, attempt: att }) => {
        setExercise(ex);
        setAttempt(att);
        setCode(att.code || ex.starterCode);
        setStreaming('');
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  // Debounced autosave, so a refresh never loses work in progress.
  useEffect(() => {
    if (!slug || !attempt || code === attempt.code) return;

    setSaving(true);
    const timer = setTimeout(() => {
      api
        .saveCode(slug, { code })
        .then(({ attempt: saved }) => setAttempt(saved))
        .catch(() => {})
        .finally(() => setSaving(false));
    }, 800);

    return () => clearTimeout(timer);
  }, [code, slug, attempt]);

  const requestFeedback = (kind) => {
    if (busy) return;
    setError(null);
    setStreaming(' ');

    abortRef.current = streamFeedback(
      slug,
      { code, kind },
      {
        onStart: (meta) => setStreamingMeta(meta),
        onDelta: (delta) => setStreaming((prev) => (prev === ' ' ? delta : prev + delta)),
        onError: (err) => {
          setError(err.message);
          setStreaming('');
          abortRef.current = null;
        },
        onDone: async () => {
          abortRef.current = null;
          setStreaming('');
          setStreamingMeta(null);

          const { attempt: fresh } = await api.getExercise(slug);
          setAttempt(fresh);
          refreshExercises();
        },
      }
    );
  };

  const stop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStreaming('');
    setStreamingMeta(null);
  };

  const reset = async () => {
    const { attempt: fresh } = await api.reset(slug);
    setAttempt(fresh);
    setCode(fresh.code);
    refreshExercises();
  };

  const markSolved = async () => {
    const { attempt: saved } = await api.saveCode(slug, { code, solved: true });
    setAttempt(saved);
    refreshExercises();
  };

  const maxHintLevel = provider?.maxHintLevel ?? 4;
  const hintsLeft = maxHintLevel - (attempt?.hintLevel ?? 0);

  return (
    <div className="layout">
      <ExerciseList
        exercises={exercises}
        activeSlug={slug}
        provider={provider}
        onSelect={setSlug}
      />

      <main className="workspace">
        {error && <div className="banner banner--error">{error}</div>}

        {exercise && (
          <>
            <header className="brief">
              <div className="brief__head">
                <h2>{exercise.title}</h2>
                <span className={`badge badge--${exercise.difficulty}`}>
                  {exercise.difficulty}
                </span>
                {attempt?.solved && <span className="badge badge--solved">solved</span>}
              </div>

              <p>{exercise.prompt}</p>

              {exercise.requirements?.length > 0 && (
                <ul className="brief__reqs">
                  {exercise.requirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              )}
            </header>

            <section className="editor">
              <Editor
                height="100%"
                language={exercise.language}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            </section>

            <div className="actions">
              <button onClick={() => requestFeedback('review')} disabled={busy}>
                Review my code
              </button>

              <button
                className="actions__hint"
                onClick={() => requestFeedback('hint')}
                disabled={busy || hintsLeft <= 0}
              >
                {hintsLeft > 0 ? `Hint (${hintsLeft} left)` : 'No hints left'}
              </button>

              {busy && (
                <button className="actions__stop" onClick={stop}>
                  Stop
                </button>
              )}

              <span className="actions__spacer" />
              <span className="actions__status">{saving ? 'Saving…' : 'Saved'}</span>

              <button className="actions__ghost" onClick={markSolved} disabled={attempt?.solved}>
                Mark solved
              </button>
              <button className="actions__ghost" onClick={reset}>
                Reset
              </button>
            </div>
          </>
        )}
      </main>

      <section className="panel">
        <FeedbackPanel
          history={attempt?.feedback ?? []}
          streaming={streaming.trim() ? streaming : ''}
          streamingMeta={streamingMeta}
          maxHintLevel={maxHintLevel}
        />
      </section>
    </div>
  );
}
