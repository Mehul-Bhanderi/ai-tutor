export function FeedbackPanel({ history, streaming, streamingMeta, maxHintLevel }) {
  const hasContent = history.length > 0 || streaming;

  if (!hasContent) {
    return (
      <div className="feedback feedback--empty">
        <h3>No feedback yet</h3>
        <p>
          Write an attempt and ask for a review, or take a hint if you are stuck. Hints escalate —
          the first is a nudge, the {ordinal(maxHintLevel)} gives the full solution.
        </p>
      </div>
    );
  }

  return (
    <div className="feedback">
      {history.map((item) => (
        <FeedbackItem key={item._id || item.createdAt} item={item} />
      ))}

      {streaming && (
        <FeedbackItem
          item={{ kind: streamingMeta?.kind, level: streamingMeta?.level, content: streaming }}
          pending
        />
      )}
    </div>
  );
}

function FeedbackItem({ item, pending }) {
  const label =
    item.kind === 'hint' ? `Hint ${item.level ?? ''}`.trim() : 'Review';

  return (
    <article className={`feedback__item feedback__item--${item.kind}`}>
      <header>
        <span className="feedback__label">{label}</span>
        {item.provider && !pending && (
          <span className="feedback__meta">
            {item.provider} · {item.model}
          </span>
        )}
      </header>
      <div className="feedback__body">
        {item.content}
        {pending && <span className="cursor" aria-hidden="true" />}
      </div>
    </article>
  );
}

function ordinal(n) {
  const names = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' };
  return names[n] || `${n}th`;
}
