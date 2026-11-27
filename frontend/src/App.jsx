import { lazy, Suspense, useEffect, useState } from 'react'

const Economia = lazy(() => import('./pages/Economia'))

const ORIGENS_PERMITIDAS = [
  'https://bahia-hub.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default function App() {
  const [hubTheme, setHubTheme] = useState(null)

  useEffect(() => {
    const aoReceberMensagem = (event) => {
      if (!ORIGENS_PERMITIDAS.includes(event.origin)) return
      if (event.data?.type === 'bahia-hub:theme') {
        const tema = event.data.theme === 'dark' ? 'dark' : 'light'
        document.documentElement.classList.add('bahia-hub')
        document.documentElement.classList.toggle('dark', tema === 'dark')
        setHubTheme(tema)
      }
    }

    window.addEventListener('message', aoReceberMensagem)
    return () => window.removeEventListener('message', aoReceberMensagem)
  }, [])

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Economia hubTheme={hubTheme} />
    </Suspense>
  )
}
