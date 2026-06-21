import { fmtInt } from '../lib/format.js'

function newPartItem() {
  return { id: String(Date.now() + Math.random()), number: '', title: '', qty: 1, price: 0, discount: 0 }
}

function parseNum(raw) {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function calcPartTotal(it) {
  return Math.max(0, parseNum(it.qty) * parseNum(it.price) - parseNum(it.discount))
}

export function calcPartsItemsTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, it) => sum + calcPartTotal(it), 0)
}

export function calcPartsItemsDiscount(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, it) => sum + parseNum(it.discount), 0)
}

export default function PartsItemsEditor({ items = [], onChange, disabled }) {
  const update = (id, patch) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const remove = (id) => {
    onChange(items.filter((it) => it.id !== id))
  }

  const add = () => {
    onChange([...items, newPartItem()])
  }

  return (
    <div className="partsItemsEditor">
      {items.length > 0 && (
        <div className="partsItemsEditor__header" aria-hidden="true">
          <span className="partsItemsEditor__col partsItemsEditor__col--num">№</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--article">Артикул</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--title">Наименование</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--qty">Кол-во</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--price">Цена, ₽</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--discount">Скидка, ₽</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--total">Сумма, ₽</span>
          <span className="partsItemsEditor__col partsItemsEditor__col--del" aria-hidden="true" />
        </div>
      )}
      {items.map((it, idx) => {
        const total = calcPartTotal(it)
        return (
          <div key={it.id} className="partsItemsEditor__row">
            <span className="partsItemsEditor__col partsItemsEditor__col--num muted small">{idx + 1}</span>
            <input
              className="input partsItemsEditor__col partsItemsEditor__col--article"
              placeholder="Артикул"
              value={it.number}
              disabled={disabled}
              onChange={(e) => update(it.id, { number: e.target.value })}
              aria-label={`Запчасть ${idx + 1}: артикул`}
            />
            <input
              className="input partsItemsEditor__col partsItemsEditor__col--title"
              placeholder="Название детали"
              value={it.title}
              disabled={disabled}
              onChange={(e) => update(it.id, { title: e.target.value })}
              aria-label={`Запчасть ${idx + 1}: название`}
            />
            <input
              className="input partsItemsEditor__col partsItemsEditor__col--qty"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Кол-во"
              value={it.qty}
              disabled={disabled}
              onChange={(e) => update(it.id, { qty: e.target.value })}
              aria-label={`Запчасть ${idx + 1}: количество`}
            />
            <input
              className="input partsItemsEditor__col partsItemsEditor__col--price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Цена, ₽"
              value={it.price}
              disabled={disabled}
              onChange={(e) => update(it.id, { price: e.target.value })}
              aria-label={`Запчасть ${idx + 1}: цена`}
            />
            <input
              className="input partsItemsEditor__col partsItemsEditor__col--discount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Скидка, ₽"
              value={it.discount}
              disabled={disabled}
              onChange={(e) => update(it.id, { discount: e.target.value })}
              aria-label={`Запчасть ${idx + 1}: скидка`}
            />
            <span className="partsItemsEditor__col partsItemsEditor__col--total muted small">
              {total > 0 ? fmtInt(total) : '—'}
            </span>
            {!disabled && (
              <button
                type="button"
                className="btn partsItemsEditor__col partsItemsEditor__col--del"
                data-variant="ghost"
                onClick={() => remove(it.id)}
                aria-label={`Удалить запчасть ${idx + 1}`}
                title="Удалить"
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      <div className="partsItemsEditor__footer">
        {!disabled && (
          <button type="button" className="btn" data-variant="outline" onClick={add}>
            + Добавить запчасть / материал
          </button>
        )}
        {items.length > 0 && (
          <div className="partsItemsEditor__totalRow muted small">
            Итого запчастей:{' '}
            <strong>{fmtInt(calcPartsItemsTotal(items))} ₽</strong>
          </div>
        )}
      </div>
    </div>
  )
}
