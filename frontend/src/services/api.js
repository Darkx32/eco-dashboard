import { useEffect } from 'react'
import Economia from './pages/Economia'
import { buscarSerie } from './services/api'

export default function App() {
  useEffect(() => {
    buscarSerie(7060, 63).then(console.log).catch(console.error)
  }, [])

  return <Economia />
}