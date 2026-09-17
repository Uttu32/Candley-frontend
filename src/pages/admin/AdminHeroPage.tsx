import { useEffect, useState } from 'react'
import { triggerToast } from '../../components/common/ToastContainer'
import { api, type HeroSlide } from '../../services/api'

export const AdminHeroPage = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState('')
  useEffect(() => { void api.adminHeroSlides().then(setSlides).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load hero slides')) }, [])
  const upload = async (slide: HeroSlide, target: 'desktopImage' | 'mobileImage', image: File | undefined) => { const id = slide._id ?? slide.id; if (!id || !image) return; setUploading(`${id}-${target}`); try { const updated = await api.updateHeroImage(id, image, target); setSlides((current) => current.map((item) => (item._id === id || item.id === id ? updated : item))); triggerToast('Hero image updated') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload hero image') } finally { setUploading('') } }
  return <section><span className="eyebrow">Content</span><h2>Hero media</h2>{error && <p className="form-error">{error}</p>}{slides.length === 0 && !error && <p>No hero slides found.</p>}<div className="admin-hero-list">{slides.map((slide) => { const id = slide._id ?? slide.id ?? slide.heading; return <article className="admin-panel" key={id}><h3>{slide.heading}</h3><div className="field-grid"><label>Desktop image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(slide, 'desktopImage', event.target.files?.[0])} /></label><label>Mobile image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(slide, 'mobileImage', event.target.files?.[0])} /></label></div><div className="admin-hero-previews">{slide.desktopImage && <img src={slide.desktopImage} alt="Desktop hero preview" />}{slide.mobileImage && <img src={slide.mobileImage} alt="Mobile hero preview" />}</div>{uploading.startsWith(`${id}-`) && <p>Uploading...</p>}</article> })}</div></section>
}