/**
 * Компактный индикатор загрузки (страница или данные).
 * Ромб с «бегущими» по кругу цветами: акцент, «Открыть», серый как у «Развернуть».
 * size: page — ленивые маршруты; default — блок контента; inline — в строке текста.
 */
export function PageLoadSpinner({ label = 'Загрузка…', size = 'default', className = '' }) {
  const rootClass = ['pageLoadSpinner', size !== 'default' ? `pageLoadSpinner--${size}` : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <span className="pageLoadSpinner__diamond" aria-hidden="true">
        <span className="pageLoadSpinner__diamondInner" />
      </span>
      {label ? <span className="pageLoadSpinner__label">{label}</span> : null}
    </span>
  )
}
