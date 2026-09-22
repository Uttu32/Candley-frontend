export type Product = {
  _id: string
  slug: string
  name: string
  category: string
  collection: string
  fragrance: string
  description: string
  shortDescription: string
  price: number
  mrp: number
  rating: number
  reviews: number
  badge: 'Bestseller' | 'New' | 'Limited' | 'Trending' | 'Sale' | 'Sold Out' | 'Low Stock' | null
  stock: number
  images: string[]
  tags: string[]
  variants?: Array<{
    _id: string
    label: string
    price: number
    stock: number
  }>
}

export type CartItem = {
  productId: string
  variantId?: string
  quantity: number
}

export type Category = {
  _id: string
  name: string
  slug: string
  count: number
  image: string
}
