import { useState } from 'react';
import TextOverlay from './TextOverlay.jsx';
import Loader from './Loader.jsx';

import GeeseCanvasContainer from './GeeseCanvasContainer.jsx';
import '../App.css';

function App() {
  const [geesePositions, setGeesePositions] = useState({})

  return (
    <div className="app-container">
      <Loader />
      <div className="hero-section">
        <GeeseCanvasContainer setGeesePositions={setGeesePositions} />
        <TextOverlay geesePositions={geesePositions} />
      </div>
    </div>
  )
}

export default App