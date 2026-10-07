import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { ToastContainer } from './components/common/ToastContainer'
import { router } from './routes/router'
import { restoreSession } from './hooks/useSession'
import { createQueryClient } from './queryClient'

const queryClient = createQueryClient()

const App = () => {
  useEffect(() => { void restoreSession() }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  )
}

export default App
