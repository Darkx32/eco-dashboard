import { lazy, Suspense, useEffect } from 'react'

const Economia = lazy(() => import('./pages/Economia'))

const ORIGENS_PERMITIDAS = ['https://bahia-hub.vercel.app', 'http://localhost:5173']

export default function App() {
  useEffect(() => {
    const aoReceberMensagem = (event) => {
      if (!ORIGENS_PERMITIDAS.includes(event.origin)) return
      if (event.data?.type === 'bahia-hub:theme') {
        document.documentElement.classList.toggle('dark', event.data.theme === 'dark')
      }
    }

    window.addEventListener('message', aoReceberMensagem)
    return () => window.removeEventListener('message', aoReceberMensagem)
  }, [])

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Economia />
    </Suspense>
  )
}
