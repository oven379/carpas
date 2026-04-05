/**
 * Шеврон вниз (закрыто) / вверх (открыто) — те же линии, что у «Назад» / «Открыть».
 * Цвет задаётся снаружи (обычно var(--muted) у кнопки .dropdownCaretBtn).
 */
export function DropdownCaretIcon({ open, className = '' }) {
  const cn = ['dropdownCaretIcon__svg', className].filter(Boolean).join(' ')
  return (
    <svg className={cn} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      {open ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 14l5-5 5 5"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 10l5 5 5-5"
        />
      )}
    </svg>
  )
}
