import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Center } from '@react-three/drei'
import * as THREE from 'three'

import gooseModelUrl from '../assets/3d/goose.glb'

export default function Goose({ targetPosition, setSpherePosition2D }) {
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
            action.play();
            action.paused = false;
          }
        }
      } else {
        velocityRef.current.set(0, 0, 0);
        if (names.length > 0) {
          const action = actions[names[0]];
          if (action) {
            action.reset();
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