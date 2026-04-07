import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { formatHttpErrorMessage } from '../../api/http.js'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, Field, Input, PageLoadSpinner, ServiceHint } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile, fileToDataUrl } from '../../lib/imageCompression.js'
import { fmtDateTime, PHOTO_UPLOAD_HINTS_PARAGRAPH } from '../../lib/format.js'
import { DOCS_UPLOAD_BATCH_MAX } from '../../lib/uploadLimits.js'
import { buildCarFromQuery } from '../carNav.js'
import { PhotoLightbox } from '../PhotoLightbox.jsx'
import { docsToPhotoItems } from '../../lib/photoGallery.js'
import { resolvePublicMediaUrl } from '../../lib/mediaUrl.js'
import {
  carDocDeletableByOwner,
  carDocFileBadgeLabel,
  carDocHasImageThumbnail,
} from '../../lib/carDocDisplay.js'

const MAX_DOC_FILE_BYTES = 4 * 1024 * 1024

const DOCS_ACCEPT =
  'application/pdf,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif,image/heic,image/*'

export default function DocsPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const r = useRepo()
  const { mode, loading } = useDetailing()
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
      if (!id || mode === 'detailing') return
      setDataReady(false)
      try {
        const [cr, dc] = await Promise.all([r.getCar(id), r.listDocs(id)])
        if (cancelled) return
        setCar(cr)
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
  }, [id, r, r._version, mode])

  const docGalleryItems = useMemo(() => docsToPhotoItems(docs.filter((d) => carDocHasImageThumbnail(d))), [docs])

  if (mode === 'detailing') {
    return <Navigate to={id ? `/car/${id}${buildCarFromQuery(sp.get('from'))}` : '/detailing'} replace />
  }

  if (mode === 'owner' && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  if (!dataReady) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!car) return <Navigate to="/cars" replace />

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
              Документы
            </h1>
            <ServiceHint
              scopeId="car-docs-page-hint"
              variant="compact"
              label="Справка: документы в гараже"
            >
              <p className="serviceHint__panelText">
                Сюда загружайте личные документы по авто (ПТС, договоры, сканы). Они хранятся только у вас в гараже и не
                показываются по публичной ссылке. Фото моек и работ смотрите в разделе «История». За одну загрузку — не
                более {DOCS_UPLOAD_BATCH_MAX} файлов (можно добавить ещё партией).
              </p>
              <p className="serviceHint__panelText" style={{ marginTop: 10 }}>
                Если прикрепляете снимки (JPEG, PNG и т.д.): {PHOTO_UPLOAD_HINTS_PARAGRAPH}
              </p>
            </ServiceHint>
          </div>
        </div>
      </div>

      <Card className="card pad">
        <div className="formGrid">
          <Field label="Название">
            <Input
              className="input"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="ПТС, договор, выписка…"
            />
          </Field>
          <Field className="field--full" label="Загрузить файлы">
            <div className="docsAddRow">
              <div className="filePick" style={{ margin: 0 }}>
                <input
                  id={docsFileInputId}
                  className="srOnly"
                  type="file"
                  accept={DOCS_ACCEPT}
                  multiple
                  ref={docsFileInputRef}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || [])
                    if (picked.length > DOCS_UPLOAD_BATCH_MAX) {
                      alert(
                        `За один раз можно загрузить не более ${DOCS_UPLOAD_BATCH_MAX} файлов. Выбраны первые ${DOCS_UPLOAD_BATCH_MAX}.`,
                      )
                      setFiles(picked.slice(0, DOCS_UPLOAD_BATCH_MAX))
                    } else {
                      setFiles(picked)
                    }
                    e.target.value = ''
                  }}
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
                    ? 'Файлы не выбраны'
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
                  let okCount = 0
                  let firstErr = null
                  for (const f of files.slice(0, DOCS_UPLOAD_BATCH_MAX)) {
                    try {
                      let url
                      if (f.type.startsWith('image/')) {
                        url = await compressImageFile(f, {
                          maxW: 2000,
                          maxH: 2000,
                          quality: 0.85,
                          maxBytes: 2.5 * 1024 * 1024,
                        })
                      } else {
                        if (f.size > MAX_DOC_FILE_BYTES) {
                          alert(`Файл «${f.name || 'без имени'}» слишком большой (максимум 4 МБ).`)
                          continue
                        }
                        url = await fileToDataUrl(f)
                      }
                      const title =
                        draft.title.trim() && files.length === 1
                          ? draft.title.trim()
                          : draft.title.trim()
                            ? `${draft.title.trim()} · ${f.name || 'файл'}`
                            : f.name || 'Документ'
                      await r.addDoc(null, id, { title, url, kind: 'document' })
                      okCount += 1
                    } catch (e) {
                      if (!firstErr) firstErr = e
                    }
                  }
                  if (firstErr && okCount === 0) {
                    alert(formatHttpErrorMessage(firstErr, 'Не удалось добавить документ.'))
                    return
                  }
                  if (firstErr && okCount > 0) {
                    alert(
                      `Загружено файлов: ${okCount}. Остальные не удалось отправить: ${formatHttpErrorMessage(firstErr, 'ошибка сохранения')}`,
                    )
                  }
                  if (okCount > 0) {
                    setDraft({ title: '' })
                    setFiles([])
                    invalidateRepo()
                    try {
                      const dc = await r.listDocs(id)
                      setDocs((Array.isArray(dc) ? dc : []).filter((d) => !d.eventId))
                    } catch (e) {
                      alert(formatHttpErrorMessage(e, 'Список документов не обновился.'))
                    }
                  }
                }}
              >
                Добавить
              </Button>
            </div>
            <p className="muted small" style={{ margin: '10px 0 0', lineHeight: 1.45 }}>
              Для фото-файлов: {PHOTO_UPLOAD_HINTS_PARAGRAPH}
            </p>
          </Field>
        </div>
      </Card>

      <div className="thumbs thumbs--big">
        {docs.map((d) => (
          <Card key={d.id} className="card thumbCard">
            <div className="thumbWrap">
              {(() => {
                const src = resolvePublicMediaUrl(d.url)
                if (carDocHasImageThumbnail(d)) {
                  const gi = docGalleryItems.findIndex((g) => g.id === d.id)
                  return gi >= 0 ? (
                    <button
                      type="button"
                      className="thumbCard__img thumbCard__img--btn"
                      aria-label={d.title ? `Открыть: ${d.title}` : 'Открыть'}
                      onClick={() =>
                        setPhotoLb({
                          items: docGalleryItems.map((x) => ({ url: x.url, title: x.title })),
                          startIndex: gi,
                        })
                      }
                    >
                      <img alt={d.title} src={src} />
                    </button>
                  ) : (
                    <a className="thumbCard__img" href={src} target="_blank" rel="noreferrer">
                      <img alt={d.title} src={src} />
                    </a>
                  )
                }
                return (
                  <a
                    className="thumbCard__fileDoc"
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={d.title ? `Открыть файл: ${d.title}` : 'Открыть файл'}
                  >
                    <span className="thumbCard__fileDocBadge">{carDocFileBadgeLabel(d)}</span>
                    <span className="thumbCard__fileDocHint">Открыть</span>
                  </a>
                )
              })()}
              {carDocDeletableByOwner(d) ? (
                <button
                  type="button"
                  className="thumbX"
                  title="Удалить документ"
                  onClick={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    const ok = confirm('Удалить этот документ?\n\nВосстановить будет невозможно.')
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
              <div className="muted small">{d.createdAt ? fmtDateTime(d.createdAt) : ''}</div>
            </div>
          </Card>
        ))}
        {docs.length === 0 ? (
          <Card className="card pad">
            <div className="muted">Документов пока нет.</div>
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
