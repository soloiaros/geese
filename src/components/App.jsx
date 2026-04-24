import { useState } from 'react'
import Scene from './Scene.jsx'
import TextOverlay from './TextOverlay.jsx'
import '../App.css'

function App() {
  const [spherePosition2D, setSpherePosition2D] = useState(null)

  return (
    <div className="app-container">
      <div className="hero-section">
        <div className="canvas-container">
          <Scene setSpherePosition2D={setSpherePosition2D} />
        </div>
        <TextOverlay spherePosition2D={spherePosition2D} />
      </div>
    </div>
  )
}

export default App