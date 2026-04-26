import { useState } from 'react'
import Scene from './Scene.jsx'
import TextOverlay from './TextOverlay.jsx'
import Loader from './Loader.jsx'
import '../App.css'

function App() {
  const [geesePositions, setGeesePositions] = useState({})

  return (
    <div className="app-container">
      <Loader />
      <div className="hero-section">
        <div className="canvas-container">
          <Scene setGeesePositions={setGeesePositions} />
        </div>
        <TextOverlay geesePositions={geesePositions} />
      </div>
    </div>
  )
}

export default App