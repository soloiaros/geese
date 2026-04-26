import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Center } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'

import gooseModelUrl from '../assets/3d/goose.glb'

export default function Goose({ 
  id,
  targetPosition, 
  setGeesePositions, 
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
  
  // Generate a random, persistent offset for this goose to avoid perfect syncing
  const randomOffset = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 0.5; // Radius between 0.5 and 1.0
    return { x: Math.abs(Math.cos(angle)) * r, z: Math.abs(Math.sin(angle)) * r };
  }, []);

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

      const currentPos = groupRef.current.position;
      
      const targetVec = new THREE.Vector3(
        currentPos.x >= targetPosition[0] ? targetPosition[0] + randomOffset.x : targetPosition[0] - randomOffset.x, 
        targetPosition[1] * 1.2, 
        currentPos.z >= targetPosition[2] ? targetPosition[2] + randomOffset.z : targetPosition[2] - randomOffset.z,
      );
      
      const toTarget = new THREE.Vector3().subVectors(targetVec, currentPos);
      const distance = toTarget.length();

      const directTargetVec = new THREE.Vector3(targetPosition[0], targetPosition[1] * 1.2, targetPosition[2]);
      const bufferDistance = new THREE.Vector3().subVectors(directTargetVec, targetVec).length();
      
      const MAX_SPEED = 1.5; 
      const desiredVelocity = toTarget.clone();
      
      let tooClose = false;
      if (distance < 0.01 || (distance <= bufferDistance && velocityRef.current.lengthSq() < 0.0001)) {
        tooClose = true;
      }

      // Calculate smooth ease-out speed
      let desiredSpeed = 0;
      if (!tooClose && distance > 0.01) {
        // Taper speed based on distance for a smooth, gradual stop
        const t2 = Math.min(distance / 2.0, 1.0);
        const easeOut = t2 * (2 - t2); // Quadratic ease-out
        desiredSpeed = Math.max(easeOut * MAX_SPEED, 0.2);
        desiredVelocity.normalize().multiplyScalar(desiredSpeed);
      } else {
        desiredVelocity.set(0, 0, 0);
      }

      // Smoothly interpolate current velocity towards desired velocity for organic turns
      velocityRef.current.lerp(desiredVelocity, 5 * delta);

      const step = velocityRef.current.clone().multiplyScalar(delta);
      if (step.length() >= distance || distance < 0.01) {
        // Prevent overshooting and wobbling by snapping to the exact target
        groupRef.current.position.copy(targetVec);
        velocityRef.current.set(0, 0, 0);
      } else {
        groupRef.current.position.add(step);
      }

      const currentSpeed = velocityRef.current.length();
      
      if (currentSpeed > 0.01 && !tooClose) {
        // Face velocity direction when moving to prevent sliding, but start facing the cursor when entering the defined radius
        const cursorVec = new THREE.Vector3(targetPosition[0], groupRef.current.position.y, targetPosition[2]);
        const toCursor = new THREE.Vector3().subVectors(cursorVec, groupRef.current.position);
        const distanceToCursor = toCursor.length();

        let lookAngle;
        if (distanceToCursor < 0.5 && toCursor.lengthSq() > 0.001) {
          lookAngle = Math.atan2(toCursor.x, toCursor.z);
        } else {
          lookAngle = Math.atan2(velocityRef.current.x, velocityRef.current.z);
        }
        
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookAngle);
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
        // Face the cursor when stopped or tooClose
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

      if (setGeesePositions && !isExiting) {
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
        
        setGeesePositions(prev => ({
          ...prev,
          [id]: { x: vec.x, y: vec.y, r: radiusNDC * renderScale }
        }));
      } else if (setGeesePositions && isExiting) {
        setGeesePositions(prev => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.5, 0]} onClick={(e) => { e.stopPropagation(); console.log('click!') }}>
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
