import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage, wishlistApi } from '../services/api'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import type { Product, Wishlist } from '../types'

export const wishlistKey = ['wishlist'] as const

export const useWishlist = () => {
  const authenticated = useAppStore((state) => state.sessionStatus === 'authenticated')
  const query = useQuery({ queryKey: wishlistKey, queryFn: wishlistApi.get, enabled: authenticated, staleTime: 60_000 })
  const ids = new Set((query.data?.productIds ?? []).map((product) => product._id))
  return { ...query, ids, has: (productId: string) => ids.has(productId) }
}

/** Optimistically toggles a product, rolling back if the server rejects it. */
export const useToggleWishlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ product, saved }: { product: Product; saved: boolean }) => (saved ? wishlistApi.remove(product._id) : wishlistApi.add(product._id)),
    onMutate: async ({ product, saved }) => {
      await queryClient.cancelQueries({ queryKey: wishlistKey })
      const previous = queryClient.getQueryData<Wishlist>(wishlistKey)
      if (previous) {
        queryClient.setQueryData<Wishlist>(wishlistKey, {
          ...previous,
          productIds: saved ? previous.productIds.filter((entry) => entry._id !== product._id) : [...previous.productIds, product],
        })
      }
      return { previous }
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(wishlistKey, context.previous)
      triggerToast(errorMessage(error, 'Could not update your wishlist'), 'error')
    },
    onSuccess: (wishlist, { saved }) => {
      queryClient.setQueryData(wishlistKey, wishlist)
      triggerToast(saved ? 'Removed from wishlist' : 'Saved to wishlist')
    },
  })
}
