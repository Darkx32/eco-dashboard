import { lazy, Suspense } from 'react'

const Economia = lazy(() => import("./pages/Economia"))

export default function App() {
  return <Suspense fallback={<div>Carregando...</div>}>
    <Economia/>
  </Suspense>
}
