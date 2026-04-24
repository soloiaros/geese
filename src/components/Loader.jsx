import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import '../App.css'

const Loader = () => {
  const { progress, active } = useProgress()
  const [shown, setShown] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!active && progress === 100) {
      const timeout = setTimeout(() => {
        setOpacity(0)
        const removeTimeout = setTimeout(() => setShown(false), 500)
        return () => clearTimeout(removeTimeout)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [active, progress])

  if (!shown) return null

  return (
    <div className="loader-container" style={{ opacity, transition: 'opacity 0.5s ease-in-out' }}>
      <div className="loader-content">
        <div className="loader-bar-container">
          <div className="loader-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="loader-text">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}

export default Loader
