import { useId } from 'react'
import { fmtInt } from '../lib/format.js'

function newWorkItem() {
  return { id: String(Date.now() + Math.random()), title: '', qty: 1, price: 0 }
}

function parseNum(raw) {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function calcWorkItemsTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, it) => sum + parseNum(it.qty) * parseNum(it.price), 0)
}

export default function WorkItemsEditor({ items = [], onChange, disabled }) {
  const labelId = useId()

  const update = (id, patch) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const remove = (id) => {
    onChange(items.filter((it) => it.id !== id))
  }

  const add = () => {
    onChange([...items, newWorkItem()])
  }

  return (
    <div className="workItemsEditor">
      {items.length > 0 && (
        <div className="workItemsEditor__header" aria-hidden="true">
          <span />
          <span className="workItemsEditor__col workItemsEditor__col--title">Наименование работы</span>
          <span className="workItemsEditor__col workItemsEditor__col--qty">Кол-во</span>
          <span className="workItemsEditor__col workItemsEditor__col--price">Цена, ₽</span>
          <span className="workItemsEditor__col workItemsEditor__col--total">Сумма, ₽</span>
          <span className="workItemsEditor__col workItemsEditor__col--del" aria-hidden="true" />
        </div>
      )}
      {items.map((it, idx) => {
        const total = parseNum(it.qty) * parseNum(it.price)
        return (
          <div key={it.id} className="workItemsEditor__row">
            <span className="workItemsEditor__num muted small">{idx + 1}</span>
            <input
              className="input workItemsEditor__col workItemsEditor__col--title"
              placeholder="Название работы"
              value={it.title}
              disabled={disabled}
              onChange={(e) => update(it.id, { title: e.target.value })}
              aria-label={`Работа ${idx + 1}: название`}
            />
            <input
              className="input workItemsEditor__col workItemsEditor__col--qty"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Кол-во"
              value={it.qty}
              disabled={disabled}
              onChange={(e) => update(it.id, { qty: e.target.value })}
              aria-label={`Работа ${idx + 1}: количество`}
            />
            <input
              className="input workItemsEditor__col workItemsEditor__col--price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Цена, ₽"
              value={it.price}
              disabled={disabled}
              onChange={(e) => update(it.id, { price: e.target.value })}
              aria-label={`Работа ${idx + 1}: цена`}
            />
            <span className="workItemsEditor__col workItemsEditor__col--total muted small">
              {total > 0 ? fmtInt(total) : '—'}
            </span>
            {!disabled && (
              <button
                type="button"
                className="btn workItemsEditor__col workItemsEditor__col--del"
                data-variant="ghost"
                onClick={() => remove(it.id)}
                aria-label={`Удалить работу ${idx + 1}`}
                title="Удалить"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      <div className="workItemsEditor__footer">
        {!disabled && (
          <button type="button" className="btn" data-variant="outline" onClick={add}>
            + Добавить работу
          </button>
        )}
        {items.length > 0 && (
          <div className="workItemsEditor__totalRow muted small">
            Итого работ:{' '}
            <strong>{fmtInt(calcWorkItemsTotal(items))} ₽</strong>
          </div>
        )}
      </div>
    </div>
  )
}
