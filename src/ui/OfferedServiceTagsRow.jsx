/**
 * Теги выбранных услуг профиля (детейлинг / ТО): из чекбоксов и своих строк.
 * Клик по тегу убирает услугу из списка.
 */
export default function OfferedServiceTagsRow({ items, onRemove, emptyHint, ariaLabel }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div className="offeredSvcTagsBlock">
      <div className="offeredSvcTagsMeta muted small">
        Выбрано{list.length ? `: ${list.length}` : ''}
      </div>
      {list.length ? (
        <div className="offeredSvcTags" role="list" aria-label={ariaLabel}>
          {list.map((s) => (
            <button
              type="button"
              key={s}
              className="offeredSvcTag"
              role="listitem"
              onClick={() => onRemove(s)}
              title="Убрать из списка"
            >
              <span className="offeredSvcTag__text">{s}</span>
              <span className="offeredSvcTag__x" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted small offeredSvcTagsEmpty">{emptyHint}</p>
      )}
    </div>
  )
}
