import { useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Button, Card, Field, Input } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'

export default function DocsPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, owner, mode } = useDetailing()
  const scope = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = r.getCar(id, scope)
  const [draft, setDraft] = useState({ title: '' })
  const [files, setFiles] = useState([])
  const [editThumbs, setEditThumbs] = useState(false)
  const docsFileInputId = useId()
  const docsFileInputRef = useRef(null)

  const docs = useMemo(() => {
    if (!car) return []
    const sc = mode === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
    return r.listDocs(id, sc)
  }, [car, id, r, mode, owner?.email, detailingId])

  if (!car) return <Navigate to="/cars" replace />

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={`/car/${id}`}>Карточка авто</Link>
            <span> / </span>
            <span>Документы</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <button className="carBack" type="button" title="Назад" onClick={() => nav(-1)}>
              <span className="chev chev--left" aria-hidden="true" />
              <span className="srOnly">Назад</span>
            </button>
            <h1 className="h1" style={{ margin: 0 }}>
              Документы / фото
            </h1>
          </div>
          <p className="muted">Загрузка фото и документов сохраняется локально в браузере (MVP).</p>
        </div>
        {docs.length > 0 ? (
          <button
            type="button"
            className="btn"
            data-variant={editThumbs ? 'primary' : 'ghost'}
            onClick={() => setEditThumbs((v) => !v)}
          >
            {editThumbs ? 'Готово' : 'Удаление фото'}
          </button>
        ) : null}
      </div>

      <Card className="card pad">
        <h2 className="h2">Добавить файл</h2>
        <div className="formGrid">
          <Field label="Название">
            <Input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Фото салона / ПТС / Сервисная книжка…"
            />
          </Field>
          <Field
            className="field--full"
            label={
              <span>
                Загрузить <span className="textAccent">фото</span> / файлы
              </span>
            }
          >
            <div className="filePick">
              <input
                id={docsFileInputId}
                className="srOnly"
                type="file"
                accept="image/*"
                multiple
                ref={docsFileInputRef}
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <button
                type="button"
                className="btn filePick__btn"
                data-variant="outline"
                onClick={() => docsFileInputRef.current?.click?.()}
              >
                Выбрать файлы
              </button>
              <span className="filePick__status" title={files.map((f) => f.name).join(', ')}>
                {!files.length
                  ? 'Файл не выбран'
                  : files.length === 1
                    ? files[0].name || '1 файл'
                    : `Выбрано файлов: ${files.length}`}
              </span>
            </div>
          </Field>
        </div>
        <div className="row gap">
          <Button
            className="btn"
            variant="primary"
            onClick={async () => {
              if (!files.length) {
                alert('Выберите один или несколько файлов.')
                return
              }
              for (const f of files) {
                try {
                  const url = await compressImageFile(f, {
                    maxW: 1600,
                    maxH: 1600,
                    quality: 0.84,
                    maxBytes: 2 * 1024 * 1024,
                  })
                  const title =
                    draft.title.trim() && files.length === 1
                      ? draft.title.trim()
                      : draft.title.trim()
                        ? `${draft.title.trim()} · ${f.name || 'файл'}`
                        : f.name || 'Фото'
                  r.addDoc(scope, id, { title, url, kind: 'photo' })
                } catch {
                  // ignore
                }
              }
              setDraft({ title: '' })
              setFiles([])
              invalidateRepo()
            }}
          >
            Добавить
          </Button>
        </div>
      </Card>

      <div className="thumbs thumbs--big">
        {docs.map((d) => (
          <Card key={d.id} className="card thumbCard">
            <div className="thumbWrap">
              <a className="thumbCard__img" href={d.url} target="_blank" rel="noreferrer">
                <img alt={d.title} src={d.url} />
              </a>
              {editThumbs ? (
                <button
                  type="button"
                  className="thumbX"
                  title="Удалить фото"
                  onClick={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    if (d.source === 'service' && mode === 'owner') {
                      alert('Подтверждённые файлы детейлинга нельзя удалять из кабинета владельца.')
                      return
                    }
                    const ok = confirm('Удалить этот файл?\n\nВосстановить будет невозможно.')
                    if (!ok) return
                    r.deleteDoc(d.id)
                    invalidateRepo()
                  }}
                >
                  <span className="thumbX__icon" aria-hidden="true">
                    ×
                  </span>
                </button>
              ) : null}
            </div>
            <div className="thumbCard__body">
              <div className="thumbCard__title">{d.title}</div>
              <div className="row spread gap">
                <a className="link" href={d.url} target="_blank" rel="noreferrer">
                  открыть →
                </a>
                <span className="muted small">
                  {editThumbs ? 'Крестик на фото удаляет файл' : 'Включите «Удаление фото», чтобы убрать файлы'}
                </span>
              </div>
            </div>
          </Card>
        ))}
        {docs.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Файлов пока нет.</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

