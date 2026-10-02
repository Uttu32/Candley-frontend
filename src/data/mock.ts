import type { Category } from '../types'

export const categories: Category[] = [
    { _id: 'soy', name: 'Soy Candles', slug: 'soy-candles', count: 24, image: '/images/musk-rose-collection.png' },
    { _id: 'luxury', name: 'Luxury Candles', slug: 'luxury-candles', count: 16, image: '/images/lotus-urli-candle.png' },
    { _id: 'floral', name: 'Floral', slug: 'floral', count: 14, image: '/images/musk-rose-candle.png' },
    { _id: 'woody', name: 'Woody', slug: 'woody', count: 12, image: '/images/lotus-urli-candle.png' },
    { _id: 'fresh', name: 'Fresh', slug: 'fresh', count: 18, image: '/images/musk-rose-collection.png' },
    { _id: 'vanilla', name: 'Vanilla', slug: 'vanilla', count: 9, image: '/images/musk-rose-candle.png' },
    { _id: 'aromatherapy', name: 'Aromatherapy', slug: 'aromatherapy', count: 22, image: '/images/lotus-urli-candle.png' },
    { _id: 'gift-sets', name: 'Gift Sets', slug: 'gift-sets', count: 11, image: '/images/musk-rose-collection.png' },
]

export const featureHighlights = [
    '100% Soy Wax',
    'Cruelty Free',
    'Vegan',
    'Clean Fragrance',
    'Sustainable Packaging',
    'Made in India',
]

export const heroSlides = [
    {
        id: 'hero-1',
        heading: 'Light the room, not the rush.',
        subheading: 'Slow rituals, warm notes, and artisan-made fragrance designed for modern homes.',
        cta: 'Shop the collection',
        image: '/images/musk-rose-collection.png',
    },
    {
        id: 'hero-2',
        heading: 'Crafted for evenings that linger.',
        subheading: 'Layered fragrances, hand-poured wax, and a premium glow for deeper rituals.',
        cta: 'Explore bestsellers',
        image: '/images/lotus-urli-candle.png',
    },
    {
        id: 'hero-3',
        heading: 'Gift beautifully, live softly.',
        subheading: 'Curated gifting sets for celebrations, housewarmings, and thoughtful everyday moments.',
        cta: 'Build a gifting set',
        image: '/images/musk-rose-candle.png',
    },
]
