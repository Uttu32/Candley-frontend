import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlide } from '../../types'
import { mobileQuery, useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { optimizedImage } from '../../utils/image'

export const AUTOPLAY_MS = 6000
const SWIPE_THRESHOLD = 50

const positionClass: Record<HeroSlide['overlayPosition'], string> = {
  'top-left': 'items-start justify-start', 'top-center': 'items-start justify-center', 'top-right': 'items-start justify-end',
  'center-left': 'items-center justify-start', center: 'items-center justify-center', 'center-right': 'items-center justify-end',
  'bottom-left': 'items-end justify-start', 'bottom-center': 'items-end justify-center', 'bottom-right': 'items-end justify-end',
}
const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

/** Internal paths use the router; https links open normally. Anything else is not rendered. */
export const HeroCta = ({ url, text, variant }: { url?: string; text?: string; variant: 'primary' | 'secondary' }) => {
  if (!url || !text) return null
  const className = variant === 'primary' ? 'hero-cta hero-cta-primary' : 'hero-cta hero-cta-secondary'
  if (url.startsWith('/') && !url.startsWith('//')) {
    return <Link to={url} className={className}>{text}{variant === 'primary' && <ArrowRight size={16} aria-hidden="true" />}</Link>
  }
  if (url.startsWith('https://')) return <a href={url} className={className} rel="noopener noreferrer">{text}</a>
  return null
}

const SlideMedia = ({ slide, eager, reducedMotion, isMobile, isActive }: { slide: HeroSlide; eager: boolean; reducedMotion: boolean; isMobile: boolean; isActive: boolean }) => {
  const desktopVideo = slide.desktopVideo || slide.backgroundVideo || ''
  const video = isMobile ? slide.mobileVideo || desktopVideo : desktopVideo
  const poster = slide.posterImage || (isMobile && slide.mobileImage) || slide.desktopImage
  const alt = slide.imageAlt || slide.heading

  if (video && !reducedMotion) {
    return (
      <video
        key={video}
        className="hero-media"
        src={video}
        poster={poster ? optimizedImage(poster, 1920) : undefined}
        muted
        loop
        playsInline
        autoPlay={isActive}
        preload={eager ? 'auto' : 'none'}
        aria-label={alt}
      />
    )
  }
  const still = video ? poster : slide.desktopImage
  if (!still) return <div className="hero-media hero-media-empty" aria-hidden="true" />
  return (
    <picture>
      {!video && slide.mobileImage && <source media={mobileQuery} srcSet={optimizedImage(slide.mobileImage, 900)} />}
      <img className="hero-media" src={optimizedImage(still, 1920)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'} />
    </picture>
  )
}

export const HeroSlider = ({ slides }: { slides: HeroSlide[] }) => {
  const ordered = [...slides].sort((a, b) => a.sortOrder - b.sortOrder)
  const count = ordered.length
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery(mobileQuery)
  const [index, setIndex] = useState(0)
  // Pauses only while the pointer is on the controls or keyboard focus is inside the slider,
  // so the full-width banner keeps rotating while someone simply moves the mouse across it.
  const [interacting, setInteracting] = useState(false)
  const pointerStart = useRef<number | null>(null)

  const current = count ? Math.min(index, count - 1) : 0
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count])
  const playing = count > 1 && !reducedMotion && !interacting

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setTimeout(() => go(current + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [current, go, playing])

  if (count === 0) return null

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1) }
  }
  const onPointerDown = (event: PointerEvent<HTMLElement>) => { pointerStart.current = event.clientX }
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStart.current === null) return
    const delta = event.clientX - pointerStart.current
    pointerStart.current = null
    if (Math.abs(delta) >= SWIPE_THRESHOLD) go(current + (delta < 0 ? 1 : -1))
  }

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onKeyDown={onKeyDown}
      onFocus={(event) => { if (event.target.matches(':focus-visible')) setInteracting(true) }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false) }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStart.current = null }}
    >
      <div className="hero-track" aria-live={playing ? 'off' : 'polite'}>
        {ordered.map((slide, slideIndex) => {
          const active = slideIndex === current
          const HeadingTag = slideIndex === 0 ? 'h1' : 'h2'
          return (
            <div
              key={slide._id}
              className={`hero-panel ${active ? 'is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${count}: ${slide.heading}`}
              aria-hidden={!active}
              inert={!active}
            >
              <SlideMedia slide={slide} eager={slideIndex === 0} reducedMotion={reducedMotion} isMobile={isMobile} isActive={active} />
              <div className="hero-overlay" style={{ backgroundColor: slide.overlay?.color ?? '#000000', opacity: slide.overlay?.opacity ?? 0.35 }} aria-hidden="true" />
              <div className={`hero-content-wrap ${positionClass[slide.overlayPosition] ?? positionClass['center-left']}`}>
                <div className={`hero-content ${alignClass[slide.textAlignment] ?? 'text-left'}`}>
                  <HeadingTag className="hero-heading">{slide.heading}</HeadingTag>
                  {slide.subheading && <p className="hero-subheading">{slide.subheading}</p>}
                  <div className={`hero-ctas ${slide.textAlignment === 'center' ? 'justify-center' : slide.textAlignment === 'right' ? 'justify-end' : ''}`}>
                    <HeroCta url={slide.ctaUrl} text={slide.ctaText} variant="primary" />
                    <HeroCta url={slide.secondaryCta?.url} text={slide.secondaryCta?.text} variant="secondary" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <div className="hero-controls" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}>
          <button type="button" className="hero-control" onClick={() => go(current - 1)} aria-label="Previous slide"><ChevronLeft size={18} strokeWidth={2.25} /></button>
          <div className="hero-dots" role="group" aria-label="Choose slide">
            {ordered.map((slide, slideIndex) => (
              <button
                key={slide._id}
                type="button"
                className={`hero-dot ${slideIndex === current ? 'active' : ''}`}
                aria-label={`Go to slide ${slideIndex + 1}: ${slide.heading}`}
                aria-current={slideIndex === current ? 'true' : undefined}
                onClick={() => go(slideIndex)}
              >
                <span className="hero-dot-bar" aria-hidden="true">
                  {/* Fills over the autoplay interval, in step with the timer (both restart on resume). */}
                  {slideIndex === current && count > 1 && !reducedMotion && (
                    <span key={`${current}-${playing}`} className={`hero-dot-progress ${playing ? '' : 'is-paused'}`} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />
                  )}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="hero-control" onClick={() => go(current + 1)} aria-label="Next slide"><ChevronRight size={18} strokeWidth={2.25} /></button>
        </div>
      )}
    </section>
  )
}

/** Shown when no slides are published (or the hero API fails): branded, with no fake products. */
export const HeroFallback = () => (
  <section className="hero-slider hero-fallback" aria-label="Welcome">
    <div className="hero-content-wrap items-center justify-center">
      <div className="hero-content text-center">
        <p className="eyebrow">Candley Aroma</p>
        <h1 className="hero-heading">Hand-poured candles for slower evenings</h1>
        <div className="hero-ctas justify-center"><HeroCta url="/shop" text="Shop the collection" variant="primary" /></div>
      </div>
    </div>
  </section>
)
