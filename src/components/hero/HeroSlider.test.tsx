import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AUTOPLAY_MS, HeroFallback, HeroSlider } from './HeroSlider'
import { makeSlide, makeUser, mockApi, renderApp, signIn, storefrontDefaults } from '../../test/utils'
import { setMediaQuery } from '../../test/setup'

const renderSlider = (slides: ReturnType<typeof makeSlide>[]) => render(<MemoryRouter><HeroSlider slides={slides} /></MemoryRouter>)
const activeSlide = () => document.querySelector('.hero-panel.is-active')!

afterEach(() => vi.useRealTimers())

describe('HeroSlider', () => {
  it('renders slides in sortOrder with headings, CTAs and alt text', () => {
    renderSlider([makeSlide({ heading: 'Second', sortOrder: 2 }), makeSlide({ heading: 'First', sortOrder: 1, imageAlt: 'Candle on a table', secondaryCta: { text: 'Gifts', url: '/gift-sets' } })])
    const slides = screen.getAllByRole('group', { hidden: true }).filter((element) => element.getAttribute('aria-roledescription') === 'slide')
    expect(slides[0]).toHaveAccessibleName(/1 of 2: First/)
    expect(activeSlide()).toHaveTextContent('First')
    expect(screen.getByRole('img', { name: 'Candle on a table' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Shop now/ })).toHaveAttribute('href', '/shop')
    expect(screen.getByRole('link', { name: 'Gifts' })).toHaveAttribute('href', '/gift-sets')
  })

  it('hides inactive slides from assistive technology', () => {
    renderSlider([makeSlide({ heading: 'A' }), makeSlide({ heading: 'B' })])
    const hidden = document.querySelectorAll('.hero-panel:not(.is-active)')
    hidden.forEach((slide) => { expect(slide).toHaveAttribute('aria-hidden', 'true'); expect(slide).toHaveAttribute('inert') })
  })

  it('navigates with buttons, dots and arrow keys', () => {
    renderSlider([makeSlide({ heading: 'A' }), makeSlide({ heading: 'B' }), makeSlide({ heading: 'C' })])
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(activeSlide()).toHaveTextContent('B')
    fireEvent.click(screen.getByRole('button', { name: /Go to slide 3/ }))
    expect(activeSlide()).toHaveTextContent('C')
    fireEvent.keyDown(screen.getByRole('region', { name: 'Featured collections' }), { key: 'ArrowRight' })
    expect(activeSlide()).toHaveTextContent('A')
    fireEvent.keyDown(screen.getByRole('region', { name: 'Featured collections' }), { key: 'ArrowLeft' })
    expect(activeSlide()).toHaveTextContent('C')
  })

  it('supports swipe gestures', () => {
    renderSlider([makeSlide({ heading: 'A' }), makeSlide({ heading: 'B' })])
    const region = screen.getByRole('region', { name: 'Featured collections' })
    fireEvent.pointerDown(region, { clientX: 300 })
    fireEvent.pointerUp(region, { clientX: 150 })
    expect(activeSlide()).toHaveTextContent('B')
    fireEvent.pointerDown(region, { clientX: 100 })
    fireEvent.pointerUp(region, { clientX: 120 }) // below threshold
    expect(activeSlide()).toHaveTextContent('B')
  })

  it('autoplays and can be paused', () => {
    vi.useFakeTimers()
    renderSlider([makeSlide({ heading: 'A' }), makeSlide({ heading: 'B' })])
    act(() => { vi.advanceTimersByTime(AUTOPLAY_MS) })
    expect(activeSlide()).toHaveTextContent('B')
    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }))
    act(() => { vi.advanceTimersByTime(AUTOPLAY_MS * 2) })
    expect(activeSlide()).toHaveTextContent('B')
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not autoplay or play video when the user prefers reduced motion', () => {
    vi.useFakeTimers()
    setMediaQuery('(prefers-reduced-motion: reduce)', true)
    renderSlider([makeSlide({ heading: 'A', desktopVideo: '/a.mp4', posterImage: '/poster.jpg' }), makeSlide({ heading: 'B' })])
    act(() => { vi.advanceTimersByTime(AUTOPLAY_MS * 2) })
    expect(activeSlide()).toHaveTextContent('A')
    expect(document.querySelector('video')).toBeNull()
    expect(activeSlide().querySelector('img')).toHaveAttribute('src', '/poster.jpg')
    expect(screen.queryByRole('button', { name: /pause slideshow/i })).toBeNull()
  })

  it('renders muted inline video with poster, and the mobile image source', () => {
    renderSlider([makeSlide({ heading: 'Video', desktopImage: '', desktopVideo: '/d.mp4', posterImage: '/p.jpg' }), makeSlide({ heading: 'Image', mobileImage: '/m.jpg' })])
    const video = document.querySelector('video')!
    expect(video).toHaveAttribute('src', '/d.mp4')
    expect(video).toHaveAttribute('poster', '/p.jpg')
    expect(video.muted).toBe(true)
    expect(document.querySelector('source')).toHaveAttribute('srcset', '/m.jpg')
  })

  it('uses the mobile video on small screens', () => {
    setMediaQuery('(max-width: 767px)', true)
    renderSlider([makeSlide({ desktopVideo: '/d.mp4', mobileVideo: '/m.mp4' })])
    expect(document.querySelector('video')).toHaveAttribute('src', '/m.mp4')
  })

  it('applies overlay colour and opacity, and drops unsafe CTA links', () => {
    renderSlider([makeSlide({ overlay: { color: '#112233', opacity: 0.6 }, ctaUrl: 'javascript:alert(1)', ctaText: 'Bad' })])
    const overlay = document.querySelector('.hero-overlay') as HTMLElement
    expect(overlay.style.opacity).toBe('0.6')
    expect(overlay.style.backgroundColor).toBe('rgb(17, 34, 51)')
    expect(screen.queryByText('Bad')).toBeNull()
  })

  it('renders a single slide without carousel controls', () => {
    renderSlider([makeSlide({ heading: 'Only' })])
    expect(screen.queryByRole('button', { name: 'Next slide' })).toBeNull()
  })

  it('fallback contains no product data', () => {
    render(<MemoryRouter><HeroFallback /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /shop the collection/i })).toHaveAttribute('href', '/shop')
  })
})

describe('homepage hero integration', () => {
  it('shows slides from the public API', async () => {
    signIn(null)
    mockApi({ ...storefrontDefaults, 'GET /cms/hero': [makeSlide({ heading: 'Diwali Glow' })], 'GET /products/best-sellers': [] , 'GET /products': { items: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } } })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Diwali Glow' })).toBeInTheDocument()
  })

  it('falls back gracefully when there are no slides or the API fails', async () => {
    signIn(makeUser())
    mockApi({ ...storefrontDefaults, 'GET /cms/hero': [], 'GET /products/best-sellers': [], 'GET /products': { items: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } } })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /hand-poured candles/i })).toBeInTheDocument()
    expect(await screen.findByText(/new candles are on their way/i)).toBeInTheDocument()
  })
})
