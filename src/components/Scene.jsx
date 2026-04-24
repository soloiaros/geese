import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, useTexture, useAnimations, Center } from '@react-three/drei'
import * as THREE from 'three'

import gooseModelUrl from '../assets/3d/goose.glb'
import grassAlbedoUrl from '../assets/3d/grass_textures/Grass_Albedo.png'
import GrassField from './GrassField.jsx'

function Goose({ targetPosition, setSpherePosition2D }) {
  const groupRef = useRef()
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const { scene, animations } = useGLTF(gooseModelUrl)
  const { actions, names } = useAnimations(animations, groupRef)

  useFrame(({ camera }, delta) => {
    if (groupRef.current) {
      const targetVec = new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2]);
      const currentPos = groupRef.current.position;
      
      const toTarget = new THREE.Vector3().subVectors(targetVec, currentPos);
      const distance = toTarget.length();
      
      const MAX_SPEED = 2.3; 
      const desiredVelocity = toTarget.clone();
      
      if (distance > 0.005) {
        const desiredSpeed = Math.min(distance * 5.0, MAX_SPEED);
        desiredVelocity.normalize().multiplyScalar(desiredSpeed);
      } else {
        desiredVelocity.set(0, 0, 0);
      }

      // Smoothly interpolate current velocity towards desired velocity for organic turns
      velocityRef.current.lerp(desiredVelocity, 5 * delta);

      const step = velocityRef.current.clone().multiplyScalar(delta);
      if (distance > 0.001 && step.length() >= distance) {
        // Prevent overshooting and wobbling by snapping to the exact target
        groupRef.current.position.copy(targetVec);
        velocityRef.current.set(0, 0, 0);
      } else {
        groupRef.current.position.add(step);
      }

      const currentSpeed = velocityRef.current.length();
      
      if (currentSpeed > 0.01) {
        // Calculate angle. Goose needs to face its current velocity direction.
        const angle = Math.atan2(velocityRef.current.x, velocityRef.current.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        groupRef.current.quaternion.slerp(targetQuaternion, 10 * delta);

        if (names.length > 0) {
          const action = actions[names[0]];
          if (action) {
            if (!action.isRunning()) {
               action.play();
            }
          }
        }
      } else {
        velocityRef.current.set(0, 0, 0);
        if (names.length > 0) {
          const action = actions[names[0]];
          if (action) {
            action.stop();
          }
        }
      }

      if (setSpherePosition2D) {
        // Project the sphere's actual 3D position to 2D normalized device coordinates (NDC)
        const vec = new THREE.Vector3().copy(groupRef.current.position);
        vec.project(camera);
        
        // Calculate screen space radius
        // The sphere has radius 0.5 in 3D space
        const radius3D = 0.5;
        // Project a point at the edge of the sphere to find the 2D radius
        const edgePoint = new THREE.Vector3(groupRef.current.position.x + radius3D, groupRef.current.position.y, groupRef.current.position.z);
        edgePoint.project(camera);
        // Distance in NDC space (width of screen is 2)
        const radiusNDC = Math.abs(edgePoint.x - vec.x);
        
        setSpherePosition2D({ x: vec.x, y: vec.y, r: radiusNDC });
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      <Center>
      <primitive object={scene} />
      </Center>
    </group>
  )
}

useGLTF.preload(gooseModelUrl)

function Panel({ setTargetPosition }) {
  const { camera, size } = useThree()
  const [panelProps, setPanelProps] = useState({ args: [10, 10], position: [0, 0, 0] })

  const grassAlbedo = useTexture(grassAlbedoUrl)

  const clonedAlbedo = useMemo(() => {
    const clone = grassAlbedo.clone()
    clone.wrapS = THREE.RepeatWrapping
    clone.wrapT = THREE.RepeatWrapping
    // Ensure the albedo color is treated correctly in standard material
    clone.colorSpace = THREE.SRGBColorSpace
    return clone
  }, [grassAlbedo])

  // Tiling adjustment
  clonedAlbedo.repeat.set(panelProps.args[0] / 2, panelProps.args[1] / 2)

  useEffect(() => {
    camera.updateMatrixWorld();
    
    const raycasterTopLeft = new THREE.Raycaster();
    raycasterTopLeft.setFromCamera(new THREE.Vector2(-1, 1), camera);
    const raycasterTopRight = new THREE.Raycaster();
    raycasterTopRight.setFromCamera(new THREE.Vector2(1, 1), camera);
    const raycasterBottomLeft = new THREE.Raycaster();
    raycasterBottomLeft.setFromCamera(new THREE.Vector2(-1, -1), camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    const topLeftIntersect = new THREE.Vector3();
    const topRightIntersect = new THREE.Vector3();
    const bottomLeftIntersect = new THREE.Vector3();
    
    raycasterTopLeft.ray.intersectPlane(groundPlane, topLeftIntersect);
    raycasterTopRight.ray.intersectPlane(groundPlane, topRightIntersect);
    raycasterBottomLeft.ray.intersectPlane(groundPlane, bottomLeftIntersect);
    
    if (topLeftIntersect.z !== undefined && topRightIntersect.z !== undefined && bottomLeftIntersect.z !== undefined) {
      const zFar = topLeftIntersect.z;
      const zNear = bottomLeftIntersect.z;
      
      const width = topRightIntersect.x - topLeftIntersect.x;
      const depth = Math.abs(zNear - zFar);
      
      const centerZ = (zFar + zNear) / 2;
      
      requestAnimationFrame(() => {
        setPanelProps(prev => {
          if (prev.args[0] === width && prev.args[1] === depth && prev.position[2] === centerZ) {
            return prev;
          }
          return {
            args: [width, depth],
            position: [0, 0, centerZ]
          };
        });
      });
    }
  }, [camera, size]);

  const handlePointerMove = (e) => {
    setTargetPosition([e.point.x, 0.5, e.point.z])
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={panelProps.position}
      onPointerMove={handlePointerMove}
    >
      <planeGeometry args={panelProps.args} />
      <meshStandardMaterial map={clonedAlbedo} roughness={0.8} color="#ffffff" />
      <GrassField width={panelProps.args[0]} depth={panelProps.args[1]} />
    </mesh>
  )
}

export default function Scene({ setSpherePosition2D }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])

  return (
    <Canvas gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <PerspectiveCamera makeDefault position={[0, 5, 5]} onUpdate={(c) => c.lookAt(0, 0, 0)} fov={50} />
      <ambientLight intensity={0.4} />
      <hemisphereLight skyColor="#ffffff" groundColor="#444444" intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />

      <Panel setTargetPosition={setTargetPosition} />
      <Goose targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />
    </Canvas>
  )
}
