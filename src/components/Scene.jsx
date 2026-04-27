import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette, HueSaturation } from '@react-three/postprocessing'

import GroundAndGrass from './GroundAndGrass'
import Goose from './Goose'

import GooseSound1 from '../assets/audio/honk-sound-1.mp3';
import GooseSound2 from '../assets/audio/honk-sound-2.wav';
import GooseSound3 from '../assets/audio/honk-sound-3.wav';

export default function Scene({ setGeesePositions, isMuted }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])
  const [geese, setGeese] = useState([{ id: Date.now(), initialPosition: [0, 0.5, 0], isExiting: false }])

  const [honkCooldown, setHonkCooldown] = useState(false);
  const soundCooldownTime = 1000;
  function stopSoundEffects() {
    setHonkCooldown(true);
    setTimeout(() => {setHonkCooldown(false)}, soundCooldownTime);
  }

  const addGoose = (position) => {
    setGeese((prev) => {
      const activeGeese = prev.filter(g => !g.isExiting);
      let newGeese = [...prev, { id: Date.now(), initialPosition: position, isExiting: false }];
      
      if (activeGeese.length >= 3) {
        const oldestActiveId = activeGeese[0].id;
        newGeese = newGeese.map(g => g.id === oldestActiveId ? { ...g, isExiting: true } : g);
      }
      return newGeese;
    });
  }

  const removeGoose = (id) => {
    setGeese((prev) => prev.filter((g) => g.id !== id));
    setGeesePositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <div className="canvas-container">
      <Canvas shadows>
        <OrthographicCamera makeDefault position={[0, 3, 3]} onUpdate={(c) => c.lookAt(0, 0, 0)} zoom={130} />
      
        <Environment preset="forest" />
        <ambientLight intensity={0.2} color="#cce0ff" />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.2}
          color="#fff4e6"
          castShadow
        />
        <GroundAndGrass setTargetPosition={setTargetPosition} addGoose={addGoose} />
        {geese.map((goose) => {
          return (
            <Goose
              key={goose.id}
              id={goose.id}
              targetPosition={targetPosition}
              setGeesePositions={setGeesePositions}
              initialPosition={goose.initialPosition}
              isExiting={goose.isExiting}
              onExitComplete={() => removeGoose(goose.id)}
              spawnAnimationDuration={0.8}
              soundPath={[GooseSound1, GooseSound2, GooseSound3].at(Math.floor(Math.random() * 3))}
              onHonk={stopSoundEffects}
              honkCooldown={honkCooldown}
              isMuted={isMuted}
            />
          );
        })}
        <EffectComposer disableNormalPass>
          <HueSaturation hue={0.05} saturation={0.2} />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}