import { useEffect, useState } from 'react'
import { triggerToast } from '../../components/common/ToastContainer'
import { api, type HeroSlide } from '../../services/api'

const emptySlideForm: Partial<HeroSlide> = {
  heading: '',
  subheading: '',
  ctaText: '',
  ctaUrl: '',
  active: true,
  sortOrder: 1,
}

export const AdminHeroPage = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newSlide, setNewSlide] = useState<Partial<HeroSlide>>(emptySlideForm)

  useEffect(() => { void api.adminHeroSlides().then(setSlides).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load hero slides')) }, [])

  const upload = async (slide: HeroSlide, target: 'desktopImage' | 'mobileImage', image: File | undefined) => {
    const id = slide._id ?? slide.heading
    if (!id || !image) return
    setUploading(`${id}-${target}`)
    try {
      const updated = await api.updateHeroImage(id, image, target)
      setSlides((current) => current.map((item) => (item._id === id ? updated : item)))
      triggerToast('Hero image updated')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload hero image')
    } finally {
      setUploading('')
    }
  }

  const onCreateSlide = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newSlide.heading?.trim() || !newSlide.subheading?.trim()) {
      setError('Heading and subheading are required.')
      return
    }

    try {
      const created = await api.createHeroSlide({
        heading: newSlide.heading.trim(),
        subheading: newSlide.subheading.trim(),
        ctaText: newSlide.ctaText?.trim() || undefined,
        ctaUrl: newSlide.ctaUrl?.trim() || undefined,
        active: newSlide.active ?? true,
        sortOrder: Number(newSlide.sortOrder ?? slides.length + 1),
      })
      setSlides((current) => [created, ...current])
      setNewSlide(emptySlideForm)
      setIsAdding(false)
      setError('')
      triggerToast('Hero slide created')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create hero slide')
    }
  }

  return (
    <section>
      <div className="account-heading">
        <div>
          <span className="eyebrow">Content</span>
          <h2>Hero media</h2>
        </div>
        <button type="button" className="primary-button" onClick={() => setIsAdding((current) => !current)}>
          {isAdding ? 'Close' : 'Add new'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {slides.length === 0 && !error && !isAdding && <p>No hero slides found.</p>}

      {isAdding && (
        <form className="admin-panel admin-product-form" onSubmit={onCreateSlide}>
          <div className="field-grid">
            <label>
              Heading
              <input required value={newSlide.heading ?? ''} onChange={(event) => setNewSlide((current) => ({ ...current, heading: event.target.value }))} />
            </label>
            <label>
              Subheading
              <input required value={newSlide.subheading ?? ''} onChange={(event) => setNewSlide((current) => ({ ...current, subheading: event.target.value }))} />
            </label>
            <label>
              CTA text
              <input value={newSlide.ctaText ?? ''} onChange={(event) => setNewSlide((current) => ({ ...current, ctaText: event.target.value }))} />
            </label>
            <label>
              CTA URL
              <input value={newSlide.ctaUrl ?? ''} onChange={(event) => setNewSlide((current) => ({ ...current, ctaUrl: event.target.value }))} />
            </label>
            <label>
              Sort order
              <input type="number" min="1" value={newSlide.sortOrder ?? slides.length + 1} onChange={(event) => setNewSlide((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={newSlide.active ?? true} onChange={(event) => setNewSlide((current) => ({ ...current, active: event.target.checked }))} />
              Active
            </label>
          </div>
          <div className="profile-actions">
            <button type="submit" className="primary-button">Save slide</button>
            <button type="button" className="secondary-button" onClick={() => { setIsAdding(false); setNewSlide(emptySlideForm); setError('') }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="admin-hero-list">
        {slides.map((slide) => {
          const id = slide._id ?? slide.heading
          return (
            <article className="admin-panel" key={id}>
              <h3>{slide.heading}</h3>
              <div className="field-grid">
                <label>
                  Desktop image
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(slide, 'desktopImage', event.target.files?.[0])} />
                </label>
                <label>
                  Mobile image
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(slide, 'mobileImage', event.target.files?.[0])} />
                </label>
              </div>
              <div className="admin-hero-previews">
                {slide.desktopImage && <img src={slide.desktopImage} alt="Desktop hero preview" />}
                {slide.mobileImage && <img src={slide.mobileImage} alt="Mobile hero preview" />}
              </div>
              {uploading.startsWith(`${id}-`) && <p>Uploading...</p>}
            </article>
          )
        })}
      </div>
    </section>
  )
}