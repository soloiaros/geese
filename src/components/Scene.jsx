import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { useState, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

function Sphere({ targetPosition, setSpherePosition2D }) {
  const ref = useRef()

  useFrame(({ camera }, delta) => {
    if (ref.current) {
      // Organically move towards the target position
      const targetVec = new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2]);
      ref.current.position.lerp(targetVec, 5 * delta);

      if (setSpherePosition2D) {
        // Project the sphere's actual 3D position to 2D normalized device coordinates (NDC)
        const vec = new THREE.Vector3().copy(ref.current.position);
        vec.project(camera);
        setSpherePosition2D({ x: vec.x, y: vec.y });
      }
    }
  })

  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#c084fc" />
    </mesh>
  )
}

function Panel({ setTargetPosition }) {
  const handlePointerMove = (e) => {
    // Update target position on the XZ plane, keeping Y fixed (e.g., radius of sphere)
    setTargetPosition([e.point.x, 0.5, e.point.z])
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={handlePointerMove}
    >
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#2e303a" roughness={0.8} />
    </mesh>
  )
}

export default function Scene({ setSpherePosition2D }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 10, 10]} onUpdate={(c) => c.lookAt(0, 0, 0)} fov={50} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Panel setTargetPosition={setTargetPosition} />
      <Sphere targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />
    </Canvas>
  )
}
