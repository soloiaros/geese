import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Center } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'

import gooseModelUrl from '../assets/3d/goose.glb'

export default function Goose({ 
  targetPosition, 
  setSpherePosition2D, 
  initialPosition, 
  index, 
  totalGeese,
  isExiting = false,
  onExitComplete,
  spawnAnimationDuration = 0.8
}) {
  const groupRef = useRef()
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0))
  const scaleRef = useRef(0) // Start scaled down to 0
  const { scene: originalScene, animations } = useGLTF(gooseModelUrl)
  
  // Clone scene so multiple geese can have independent animations and materials
  const scene = useMemo(() => clone(originalScene), [originalScene])
  
  const { actions, names } = useAnimations(animations, groupRef)

  useEffect(() => {
    if (groupRef.current && initialPosition) {
      groupRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2])
    }
  }, [initialPosition])

  useFrame(({ camera }, delta) => {
    if (groupRef.current) {
      // Handle scaling animation
      if (isExiting) {
        scaleRef.current -= delta / spawnAnimationDuration / 2;
        if (scaleRef.current <= 0) {
          scaleRef.current = 0;
          if (onExitComplete) onExitComplete();
        }
      } else {
        if (scaleRef.current < 1) {
          scaleRef.current += delta / spawnAnimationDuration;
          if (scaleRef.current > 1) scaleRef.current = 1;
        }
      }
      
      let renderScale = 1;
      const t = scaleRef.current;
      if (isExiting) {
        // Cubic ease in for exiting
        renderScale = t * t * t;
      } else {
        // Elastic ease out for spawning
        if (t === 0) renderScale = 0;
        else if (t === 1) renderScale = 1;
        else {
          const c4 = (2 * Math.PI) / 3;
          renderScale = Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
      }
      groupRef.current.scale.set(renderScale, renderScale, renderScale);

      // Calculate offset based on index and totalGeese to stop in a radius around the cursor
      const radius = 0.5; // The radius around the cursor
      const angle = totalGeese > 0 ? (index / totalGeese) * Math.PI * 2 : 0;
      const xOffset = Math.cos(angle) * radius;
      const zOffset = Math.sin(angle) * radius;
      
      const targetVec = new THREE.Vector3(targetPosition[0] + xOffset, targetPosition[1], targetPosition[2] + zOffset);
      const currentPos = groupRef.current.position;
      
      const toTarget = new THREE.Vector3().subVectors(targetVec, currentPos);
      const distance = toTarget.length();
      
      const MAX_SPEED = 1.5; 
      const desiredVelocity = toTarget.clone();
      
      // Calculate smooth ease-out speed
      let desiredSpeed = 0;
      if (distance > 0.05) {
        // Taper speed based on distance for a smooth, gradual stop
        const t2 = Math.min(distance / 2.0, 1.0);
        const easeOut = t2 * (2 - t2); // Quadratic ease-out
        desiredSpeed = Math.max(easeOut * MAX_SPEED, 0.1);
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
        const movementAngle = Math.atan2(velocityRef.current.x, velocityRef.current.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), movementAngle);
        groupRef.current.quaternion.slerp(targetQuaternion, 10 * delta);

        if (names.length > 0) {
          const action = actions[names[0]];
          if (action) {
            action.play();
            // Scale animation speed based on movement speed
            const targetTimeScale = Math.max(0.3, currentSpeed / MAX_SPEED);
            action.setEffectiveTimeScale(THREE.MathUtils.lerp(action.getEffectiveTimeScale(), targetTimeScale, 10 * delta));
          }
        }
      } else {
        velocityRef.current.set(0, 0, 0);

        // Face the cursor when stopped
        const cursorVec = new THREE.Vector3(targetPosition[0], groupRef.current.position.y, targetPosition[2]);
        const toCursor = new THREE.Vector3().subVectors(cursorVec, groupRef.current.position);
        if (toCursor.lengthSq() > 0.001) {
          const lookAngle = Math.atan2(toCursor.x, toCursor.z);
          const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookAngle);
          groupRef.current.quaternion.slerp(targetQuaternion, 5 * delta);
        }

        if (names.length > 0) {
          const action = actions[names[0]];
          if (action) {
            // Smoothly wind down the animation to a freeze, instead of snapping to start
            const currentScale = action.getEffectiveTimeScale();
            if (currentScale > 0.01) {
              action.setEffectiveTimeScale(THREE.MathUtils.lerp(currentScale, 0, 2 * delta));
            } else {
              action.setEffectiveTimeScale(0);
            }
          }
        }
      }

      if (setSpherePosition2D && index === 0 && !isExiting) { // Only track the first goose for the text overlay
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
        
        setSpherePosition2D({ x: vec.x, y: vec.y, r: radiusNDC * renderScale });
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]} onClick={(e) => e.stopPropagation()}>
      <mesh visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Center>
      <primitive object={scene} />
      </Center>
    </group>
  )
}

useGLTF.preload(gooseModelUrl)
