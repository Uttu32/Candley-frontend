import { describe, expect, it } from 'vitest'
import { optimizedImage } from './image'

describe('optimizedImage', () => {
  it('adds size, format and quality transforms to Cloudinary image URLs', () => {
    expect(optimizedImage('https://res.cloudinary.com/demo/image/upload/v123/candley/products/a.jpg', 300))
      .toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_300/v123/candley/products/a.jpg')
  })

  it('leaves other URLs and already-transformed Cloudinary URLs alone', () => {
    expect(optimizedImage('/images/about-tealights.jpg', 300)).toBe('/images/about-tealights.jpg')
    expect(optimizedImage('blob:http://localhost/abc', 300)).toBe('blob:http://localhost/abc')
    const transformed = 'https://res.cloudinary.com/demo/image/upload/w_500/v1/a.jpg'
    expect(optimizedImage(transformed, 300)).toBe(transformed)
    const video = 'https://res.cloudinary.com/demo/video/upload/v1/a.mp4'
    expect(optimizedImage(video, 300)).toBe(video)
  })
})
