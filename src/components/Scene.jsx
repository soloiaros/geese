import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette, HueSaturation } from '@react-three/postprocessing'

import GroundAndGrass from './GroundAndGrass'
import Goose from './Goose'

export default function Scene({ setSpherePosition2D }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])

  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[0, 5, 5]} onUpdate={(c) => c.lookAt(0, 0, 0)} fov={25} />
      
      <Environment preset="forest" />
      <ambientLight intensity={0.2} color="#cce0ff" />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.2} 
        color="#fff4e6" 
        castShadow 
      />

      <GroundAndGrass setTargetPosition={setTargetPosition} />
      <Goose targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />

      <EffectComposer disableNormalPass>
        <DepthOfField target={[0, 0.5, 0]} focalLength={0.02} bokehScale={2} height={960} />
        <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.1} intensity={0.2} />
        <HueSaturation hue={0.05} saturation={0.2} />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}