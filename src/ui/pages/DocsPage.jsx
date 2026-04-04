import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, Field, Input } from '../components.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import { fmtDateTime } from '../../lib/format.js'
import { buildCarFromQuery } from '../carNav.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'

export default function DocsPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const r = useRepo()
  const { detailingId, detailing, owner, mode } = useDetailing()
  const [car, setCar] = useState(null)
  const [docs, setDocs] = useState([])
  const [dataReady, setDataReady] = useState(false)
  const [draft, setDraft] = useState({ title: '' })
  const [files, setFiles] = useState([])
  const [photoLb, setPhotoLb] = useState(null)
  const docsFileInputId = useId()
  const docsFileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      setDataReady(false)
      try {
        const cr = await r.getCar(id)
        if (cancelled) return
        setCar(cr)
        const dc = await r.listDocs(id)
        if (cancelled) return
        setDocs((Array.isArray(dc) ? dc : []).filter((d) => !d.eventId))
      } catch {
        if (!cancelled) {
          setCar(null)
          setDocs([])
        }
      } finally {
        if (!cancelled) setDataReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, r, r._version])

  const docGalleryItems = useMemo(() => docsToPhotoItems(docs), [docs])

  if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
  if (!dataReady) {
    return (
      <div className="container muted" style={{ padding: '24px 0' }}>
        Загрузка…
      </div>
    )
  }
  if (!car) return <Navigate to={mode === 'detailing' ? '/detailing' : '/cars'} replace />

  const carCardHref = `/car/${id}${buildCarFromQuery(sp.get('from'))}`

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={carCardHref}>Карточка авто</Link>
            <span> / </span>
            <span>Документы</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to={carCardHref} title="К карточке авто" />
            <h1 className="h1" style={{ margin: 0 }}>
              Документы / фото
            </h1>
          </div>
          <p className="muted">
            Здесь — дополнительные фото и документы. Фото моек/обслуживания смотрите в разделе «История».
          </p>
        </div>
      </div>

      <Card className="card pad">
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
            <div className="docsAddRow">
              <div className="filePick" style={{ margin: 0 }}>
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
                  Добавить файл
                </button>
                <span className="filePick__status" title={files.map((f) => f.name).join(', ')}>
                  {!files.length
                    ? 'Файл не выбран'
                    : files.length === 1
                      ? files[0].name || '1 файл'
                      : `Выбрано файлов: ${files.length}`}
                </span>
              </div>
              <Button
                className="btn docsAddRow__btn"
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
                      await r.addDoc(null, id, { title, url, kind: 'photo' })
                    } catch {
                      // ignore
                    }
                  }
                  setDraft({ title: '' })
                  setFiles([])
                  invalidateRepo()
                  try {
                    const dc = await r.listDocs(id)
                    setDocs((Array.isArray(dc) ? dc : []).filter((d) => !d.eventId))
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Добавить
              </Button>
            </div>
          </Field>
        </div>
      </Card>

      <div className="thumbs thumbs--big">
        {docs.map((d) => (
          <Card key={d.id} className="card thumbCard">
            <div className="thumbWrap">
              {(() => {
                const gi = docGalleryItems.findIndex((g) => g.id === d.id)
                return gi >= 0 ? (
                  <button
                    type="button"
                    className="thumbCard__img thumbCard__img--btn"
                    aria-label={d.title ? `Открыть фото: ${d.title}` : 'Открыть фото'}
                    onClick={() =>
                      setPhotoLb({
                        items: docGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                        startIndex: gi,
                      })
                    }
                  >
                    <img alt={d.title} src={d.url} />
                  </button>
                ) : (
                  <a className="thumbCard__img" href={d.url} target="_blank" rel="noreferrer">
                    <img alt={d.title} src={d.url} />
                  </a>
                )
              })()}
              {d.source === 'owner' || mode === 'detailing' ? (
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
                    ;(async () => {
                      try {
                        await r.deleteDoc(id, d.id)
                        invalidateRepo()
                        const dc = await r.listDocs(id)
                        setDocs((Array.isArray(dc) ? dc : []).filter((x) => !x.eventId))
                      } catch {
                        alert('Не удалось удалить файл (нет доступа).')
                      }
                    })()
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
              <div className="muted small">
                {d.createdAt ? fmtDateTime(d.createdAt) : ''}
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
      <PhotoLightbox
        open={Boolean(photoLb)}
        items={photoLb?.items ?? []}
        startIndex={photoLb?.startIndex ?? 0}
        onClose={() => setPhotoLb(null)}
      />
    </div>
  )
}

