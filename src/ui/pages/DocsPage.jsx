import { useState } from 'react'
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
  if (!car) return <Navigate to="/cars" replace />

  const docs = r.listDocs(id, scope)
  const [draft, setDraft] = useState({ title: '', url: '' })
  const [files, setFiles] = useState([])

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
          <p className="muted">
            В прототипе добавляем файлы по URL (позже заменим на загрузку в сервер/облако).
          </p>
        </div>
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
          <Field label="URL файла/картинки">
            <Input
              className="input"
              value={draft.url}
              onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://..."
            />
          </Field>
          <Field label="Или загрузить фото" hint="сохранится локально в браузере">
            <input
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {files.length ? (
              <div className="muted small" style={{ marginTop: 6 }}>
                Выбрано: {files.length}
              </div>
            ) : null}
          </Field>
        </div>
        <div className="row gap">
          <Button
            className="btn"
            variant="primary"
            onClick={async () => {
              if (draft.url.trim()) {
                r.addDoc(scope, id, { title: draft.title, url: draft.url, kind: 'photo' })
              }
              if (files.length) {
                for (const f of files) {
                  try {
                    const url = await compressImageFile(f, {
                      maxW: 1600,
                      maxH: 1600,
                      quality: 0.84,
                      maxBytes: 2 * 1024 * 1024,
                    })
                    r.addDoc(scope, id, { title: f.name || 'Фото', url, kind: 'photo' })
                  } catch {
                    // ignore
                  }
                }
              }
              setDraft({ title: '', url: '' })
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
            </div>
            <div className="thumbCard__body">
              <div className="thumbCard__title">{d.title}</div>
              <div className="row spread gap">
                <a className="link" href={d.url} target="_blank" rel="noreferrer">
                  открыть →
                </a>
                <span className="muted small">удалить: крестик на фото</span>
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

