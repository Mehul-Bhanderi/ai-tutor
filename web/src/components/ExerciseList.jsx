import { useAuth } from '../context/AuthContext.jsx';

const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };

export function ExerciseList({ exercises, activeSlug, provider, onSelect }) {
  const { user, logout } = useAuth();

  const grouped = [...exercises].sort(
    (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
  );

  return (
    <aside className="sidebar">
      <h1 className="sidebar__title">Exercises</h1>

      <nav className="sidebar__list">
        {grouped.map((exercise) => (
          <button
            key={exercise.slug}
            className={`exercise ${exercise.slug === activeSlug ? 'is-active' : ''}`}
            onClick={() => onSelect(exercise.slug)}
          >
            <span className="exercise__title">
              {exercise.progress?.solved && <span className="exercise__tick">✓</span>}
              {exercise.title}
            </span>
            <span className={`badge badge--${exercise.difficulty}`}>{exercise.difficulty}</span>
          </button>
        ))}

        {!exercises.length && (
          <p className="sidebar__empty">
            No exercises found. Run <code>npm run seed</code> in the server folder.
          </p>
        )}
      </nav>

      <footer className="sidebar__footer">
        {provider && (
          <div className="sidebar__provider">
            {provider.active} · {provider.model}
          </div>
        )}
        <div className="sidebar__user">{user?.name}</div>
        <button onClick={logout}>Sign out</button>
      </footer>
    </aside>
  );
}
