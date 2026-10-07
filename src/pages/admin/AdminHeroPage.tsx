import { useState, type DragEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { adminApi, errorMessage, type HeroSlideInput } from '../../services/api'
import { overlayPositions, type HeroSlide } from '../../types'
import { formatDate, humanize } from '../../utils/format'
import { ErrorState, Skeleton } from '../../components/common/Feedback'
import { Field, FormError, SelectField, TextAreaField } from '../../components/common/Field'
import { triggerToast } from '../../components/common/ToastContainer'
import { imageTypes, slideStatus, validateHeroFile, validateSlideForm, videoTypes, type SlideFormState } from '../../utils/rules'
import { CdnImage } from '../../components/common/CdnImage'


const toLocalInput = (iso?: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

const toForm = (slide?: HeroSlide): SlideFormState => ({
  heading: slide?.heading ?? '', subheading: slide?.subheading ?? '', ctaText: slide?.ctaText ?? 'Shop now', ctaUrl: slide?.ctaUrl ?? '/shop',
  secondaryText: slide?.secondaryCta?.text ?? '', secondaryUrl: slide?.secondaryCta?.url ?? '', imageAlt: slide?.imageAlt ?? '',
  overlayPosition: slide?.overlayPosition ?? 'center-left', textAlignment: slide?.textAlignment ?? 'left',
  overlayColor: slide?.overlay?.color ?? '#000000', overlayOpacity: slide?.overlay?.opacity ?? 0.35,
  active: slide?.active ?? true, startsAt: toLocalInput(slide?.startsAt), endsAt: toLocalInput(slide?.endsAt),
})

const toInput = (form: SlideFormState): HeroSlideInput => ({
  heading: form.heading.trim(),
  subheading: form.subheading.trim(),
  ctaText: form.ctaText.trim() || undefined,
  ctaUrl: form.ctaUrl.trim() || undefined,
  secondaryCta: form.secondaryText.trim() ? { text: form.secondaryText.trim(), url: form.secondaryUrl.trim() } : null,
  imageAlt: form.imageAlt.trim(),
  overlayPosition: form.overlayPosition,
  textAlignment: form.textAlignment,
  overlay: { color: form.overlayColor, opacity: form.overlayOpacity },
  active: form.active,
  startsAt: fromLocalInput(form.startsAt),
  endsAt: fromLocalInput(form.endsAt),
})

const SlideForm = ({ slide, onDone }: { slide?: HeroSlide; onDone: () => void }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => toForm(slide))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: (input: HeroSlideInput) => (slide ? adminApi.updateHeroSlide(slide._id, input) : adminApi.createHeroSlide(input)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'hero'] }); queryClient.invalidateQueries({ queryKey: ['hero'] }); triggerToast(slide ? 'Slide updated' : 'Slide created. Add an image or video to publish it.'); onDone() },
    onError: (mutationError) => setError(errorMessage(mutationError)),
  })
  const set = <K extends keyof SlideFormState>(key: K, value: SlideFormState[K]) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateSlideForm(form)
    setErrors(found)
    setError('')
    if (Object.keys(found).length === 0) save.mutate(toInput(form))
  }

  return (
    <form className="admin-panel" onSubmit={submit} noValidate aria-label={slide ? `Edit slide ${slide.heading}` : 'New slide'}>
      <div className="field-grid">
        <Field label="Heading" required maxLength={120} value={form.heading} error={errors.heading} onChange={(event) => set('heading', event.target.value)} />
        <Field label="Image alt text" value={form.imageAlt} onChange={(event) => set('imageAlt', event.target.value)} hint="Describe the image for screen readers. Defaults to the heading." />
        <TextAreaField label="Subheading" rows={2} maxLength={220} value={form.subheading} error={errors.subheading} onChange={(event) => set('subheading', event.target.value)} className="span-2" />
        <Field label="Button text" value={form.ctaText} error={errors.ctaText} onChange={(event) => set('ctaText', event.target.value)} />
        <Field label="Button link" value={form.ctaUrl} error={errors.ctaUrl} onChange={(event) => set('ctaUrl', event.target.value)} hint="/shop or https://…" />
        <Field label="Secondary button text" value={form.secondaryText} onChange={(event) => set('secondaryText', event.target.value)} />
        <Field label="Secondary button link" value={form.secondaryUrl} error={errors.secondaryUrl} onChange={(event) => set('secondaryUrl', event.target.value)} />
        <SelectField label="Content position" value={form.overlayPosition} onChange={(event) => set('overlayPosition', event.target.value as SlideFormState['overlayPosition'])}>
          {overlayPositions.map((position) => <option key={position} value={position}>{humanize(position.replace('-', ' '))}</option>)}
        </SelectField>
        <SelectField label="Text alignment" value={form.textAlignment} onChange={(event) => set('textAlignment', event.target.value as SlideFormState['textAlignment'])}>
          {(['left', 'center', 'right'] as const).map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </SelectField>
        <Field label="Overlay colour" type="color" value={form.overlayColor} onChange={(event) => set('overlayColor', event.target.value)} />
        <Field label={`Overlay opacity (${Math.round(form.overlayOpacity * 100)}%)`} type="range" min={0} max={1} step={0.05} value={form.overlayOpacity} onChange={(event) => set('overlayOpacity', Number(event.target.value))} />
        <Field label="Show from" type="datetime-local" value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} hint="Optional" />
        <Field label="Show until" type="datetime-local" value={form.endsAt} error={errors.endsAt} onChange={(event) => set('endsAt', event.target.value)} hint="Optional" />
        <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={(event) => set('active', event.target.checked)} /> Active</label>
      </div>
      <FormError message={error} />
      <div className="profile-actions">
        <button type="submit" className="primary-button" disabled={save.isPending}>{save.isPending ? 'Saving…' : slide ? 'Save slide' : 'Create slide'}</button>
        <button type="button" className="secondary-button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

const mediaTargets = [
  { kind: 'image', target: 'desktopImage', label: 'Desktop image' },
  { kind: 'image', target: 'mobileImage', label: 'Mobile image (optional)' },
  { kind: 'video', target: 'desktopVideo', label: 'Desktop video (optional)' },
  { kind: 'video', target: 'mobileVideo', label: 'Mobile video (optional)' },
  { kind: 'image', target: 'posterImage', label: 'Video poster (optional)' },
] as const

const SlideMediaManager = ({ slide }: { slide: HeroSlide }) => {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const upload = async (kind: 'image' | 'video', target: string, file: File | undefined) => {
    if (!file) return
    const problem = validateHeroFile(file, kind)
    if (problem) return setError(problem)
    if (target === 'mobileVideo' && !slide.desktopVideo && !slide.backgroundVideo) return setError('Upload a desktop video before a mobile video')
    setError('')
    setPending(target)
    try {
      await adminApi.uploadHeroMedia(slide._id, kind, target, file)
      queryClient.invalidateQueries({ queryKey: ['admin', 'hero'] })
      queryClient.invalidateQueries({ queryKey: ['hero'] })
      triggerToast('Media uploaded')
    } catch (uploadError) {
      setError(errorMessage(uploadError, 'Upload failed'))
    } finally {
      setPending('')
    }
  }
  return (
    <div className="hero-media-grid">
      {mediaTargets.map(({ kind, target, label }) => {
        const current = slide[target] || (target === 'desktopVideo' ? slide.backgroundVideo : '')
        return (
          <div key={target} className="hero-media-slot">
            <label htmlFor={`${slide._id}-${target}`}>{label}</label>
            {current ? (kind === 'image' ? <CdnImage src={current} width={240} alt={`${label} preview`} /> : <video src={current} muted controls preload="metadata" aria-label={`${label} preview`} />) : <div className="image-placeholder">None</div>}
            <input id={`${slide._id}-${target}`} type="file" accept={(kind === 'image' ? imageTypes : videoTypes).join(',')} disabled={Boolean(pending)} onChange={(event) => { void upload(kind, target, event.target.files?.[0]); event.target.value = '' }} />
            {pending === target && <small role="status">Uploading…</small>}
          </div>
        )
      })}
      <FormError message={error} />
    </div>
  )
}

export const AdminHeroPage = () => {
  const queryClient = useQueryClient()
  const slidesQuery = useQuery({ queryKey: ['admin', 'hero'], queryFn: adminApi.heroSlides })
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['admin', 'hero'] }); queryClient.invalidateQueries({ queryKey: ['hero'] }) }
  const reorder = useMutation({
    mutationFn: adminApi.reorderHeroSlides,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'hero'] })
      const previous = queryClient.getQueryData<HeroSlide[]>(['admin', 'hero'])
      if (previous) queryClient.setQueryData(['admin', 'hero'], ids.map((id, index) => ({ ...previous.find((slide) => slide._id === id)!, sortOrder: index + 1 })))
      return { previous }
    },
    onError: (error, _ids, context) => { if (context?.previous) queryClient.setQueryData(['admin', 'hero'], context.previous); triggerToast(errorMessage(error, 'Could not reorder slides'), 'error') },
    onSuccess: (slides) => { queryClient.setQueryData(['admin', 'hero'], slides); queryClient.invalidateQueries({ queryKey: ['hero'] }); triggerToast('Order saved') },
  })
  const toggle = useMutation({
    mutationFn: (slide: HeroSlide) => adminApi.setHeroSlideActive(slide._id, !slide.active),
    onSuccess: (slide) => { refresh(); triggerToast(slide.active ? 'Slide activated' : 'Slide deactivated') },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })
  const remove = useMutation({
    mutationFn: (slide: HeroSlide) => adminApi.deleteHeroSlide(slide._id),
    onSuccess: () => { refresh(); triggerToast('Slide deleted') },
    onError: (error) => triggerToast(errorMessage(error), 'error'),
  })

  const slides = [...(slidesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const move = (from: number, to: number) => {
    if (to < 0 || to >= slides.length || from === to) return
    const ids = slides.map((slide) => slide._id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved!)
    reorder.mutate(ids)
  }
  const onDrop = (event: DragEvent, targetIndex: number) => {
    event.preventDefault()
    const fromIndex = slides.findIndex((slide) => slide._id === dragId)
    setDragId(null)
    if (fromIndex >= 0) move(fromIndex, targetIndex)
  }

  return (
    <section>
      <div className="section-row">
        <h1>Hero slides</h1>
        {editing === null && <button type="button" className="primary-button" onClick={() => setEditing('new')}>Add slide</button>}
      </div>
      <p className="account-muted">Drag slides (or use the arrows) to change the homepage order. A slide is live when it is active, within its schedule, and has an image or video.</p>
      {editing === 'new' && <SlideForm onDone={() => setEditing(null)} />}

      {slidesQuery.isPending ? <Skeleton className="skeleton-block" label="Loading slides" /> : slidesQuery.isError ? (
        <ErrorState error={slidesQuery.error} onRetry={() => void slidesQuery.refetch()} />
      ) : slides.length === 0 ? (
        <div className="empty-state"><p>No slides yet. The homepage shows a simple branded banner until you publish one.</p></div>
      ) : (
        <ol className="admin-hero-list" aria-label="Slides in display order">
          {slides.map((slide, index) => {
            const status = slideStatus(slide)
            return (
              <li
                key={slide._id}
                className={`admin-panel hero-admin-item ${dragId === slide._id ? 'dragging' : ''}`}
                draggable={editing === null}
                onDragStart={() => setDragId(slide._id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, index)}
                onDragEnd={() => setDragId(null)}
              >
                <div className="section-row">
                  <div className="hero-item-title">
                    <GripVertical size={16} aria-hidden="true" className="drag-handle" />
                    <span className="pill">{index + 1}</span>
                    <h2>{slide.heading}</h2>
                    <span className={`pill ${status === 'Live' ? 'pill-success' : status === 'Needs media' || status === 'Expired' ? 'pill-warning' : ''}`}>{status}</span>
                  </div>
                  <div className="cell-actions">
                    <button type="button" className="icon-button" aria-label={`Move ${slide.heading} up`} disabled={index === 0 || reorder.isPending} onClick={() => move(index, index - 1)}><ArrowUp size={16} /></button>
                    <button type="button" className="icon-button" aria-label={`Move ${slide.heading} down`} disabled={index === slides.length - 1 || reorder.isPending} onClick={() => move(index, index + 1)}><ArrowDown size={16} /></button>
                    <button type="button" className="text-button" onClick={() => toggle.mutate(slide)} disabled={toggle.isPending}>{slide.active ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" className="text-button" onClick={() => setEditing(editing === slide._id ? null : slide._id)}>{editing === slide._id ? 'Close' : 'Edit'}</button>
                    <button type="button" className="text-button danger" onClick={() => { if (window.confirm(`Delete slide “${slide.heading}”? Its media will also be removed.`)) remove.mutate(slide) }}>Delete</button>
                  </div>
                </div>
                {(slide.startsAt || slide.endsAt) && <p className="account-muted">Scheduled: {slide.startsAt ? formatDate(slide.startsAt, true) : 'now'} → {slide.endsAt ? formatDate(slide.endsAt, true) : 'no end'}</p>}
                {editing === slide._id ? <SlideForm slide={slide} onDone={() => setEditing(null)} /> : <SlideMediaManager slide={slide} />}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
