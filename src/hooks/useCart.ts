import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi, errorMessage } from '../services/api'
import { triggerToast } from '../components/common/ToastContainer'
import { useAppStore } from '../store/useAppStore'
import type { Cart } from '../types'

export const cartKey = ['cart'] as const
const cartMutationKey = ['cart', 'mutation'] as const

/** True while any cart change is in flight, from any component. */
export const useCartUpdating = () => useIsMutating({ mutationKey: cartMutationKey }) > 0

export const useCart = () => {
  const authenticated = useAppStore((state) => state.sessionStatus === 'authenticated')
  return useQuery({ queryKey: cartKey, queryFn: cartApi.get, enabled: authenticated, staleTime: 30_000 })
}

type LineRef = { productId: string; variantId?: string }
const sameLine = (line: Cart['items'][number], ref: LineRef) => line.productId._id === ref.productId && (line.variantId ?? undefined) === (ref.variantId ?? undefined)

/**
 * Cart mutations. Optimistic updates only touch quantities and line presence; prices, line totals and
 * the subtotal are always the server's values from the mutation response.
 */
export const useCartActions = () => {
  const queryClient = useQueryClient()

  const optimistic = async (update: (cart: Cart) => Cart) => {
    await queryClient.cancelQueries({ queryKey: cartKey })
    const previous = queryClient.getQueryData<Cart>(cartKey)
    if (previous) queryClient.setQueryData<Cart>(cartKey, update(previous))
    return { previous }
  }
  const rollback = (error: unknown, _variables: unknown, context: { previous?: Cart } | undefined) => {
    if (context?.previous) queryClient.setQueryData(cartKey, context.previous)
    triggerToast(errorMessage(error, 'Could not update your cart'), 'error')
  }
  const settle = (cart: Cart) => queryClient.setQueryData(cartKey, cart)

  const add = useMutation({
    mutationKey: cartMutationKey,
    mutationFn: (input: LineRef & { quantity: number }) => cartApi.add(input),
    onMutate: (input) => optimistic((cart) => ({ ...cart, itemCount: cart.itemCount + input.quantity })),
    onError: rollback,
    onSuccess: settle,
  })

  const setQuantity = useMutation({
    mutationKey: cartMutationKey,
    mutationFn: (input: LineRef & { quantity: number }) => cartApi.setQuantity(input.productId, input.variantId, input.quantity),
    onMutate: (input) => optimistic((cart) => ({
      ...cart,
      items: input.quantity === 0 ? cart.items.filter((line) => !sameLine(line, input)) : cart.items.map((line) => (sameLine(line, input) ? { ...line, quantity: input.quantity } : line)),
    })),
    onError: rollback,
    onSuccess: settle,
  })

  const remove = useMutation({
    mutationKey: cartMutationKey,
    mutationFn: (input: LineRef) => cartApi.remove(input.productId, input.variantId),
    onMutate: (input) => optimistic((cart) => ({ ...cart, items: cart.items.filter((line) => !sameLine(line, input)) })),
    onError: rollback,
    onSuccess: settle,
  })

  return { add, setQuantity, remove }
}
