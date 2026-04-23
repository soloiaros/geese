import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, useAnimations, Center } from '@react-three/drei'
import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import gooseModelUrl from '../assets/3d/goose.glb'

function Goose({ targetPosition, setSpherePosition2D }) {
  const groupRef = useRef()
  const { scene, animations } = useGLTF(gooseModelUrl)
  const { actions, names } = useAnimations(animations, groupRef)

  useFrame(({ camera }, delta) => {
    if (groupRef.current) {
      // Organically move towards the target position
      const targetVec = new THREE.Vector3(targetPosition[0], targetPosition[1], targetPosition[2]);
      
      const currentPos = groupRef.current.position.clone();
      const direction = new THREE.Vector3().subVectors(targetVec, currentPos);
      const distance = direction.length();

      groupRef.current.position.lerp(targetVec, 5 * delta);

      const actionName = names[0];
      const action = actionName ? actions[actionName] : null;

      if (distance > 0.001) {
        const angle = Math.atan2(direction.x, direction.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        groupRef.current.quaternion.slerp(targetQuaternion, 10 * delta);

        if (action && !action.isRunning()) {
          action.play();
        }
      } else {
        if (action && action.isRunning()) {
          action.stop();
        }
      }

      if (setSpherePosition2D) {
        // Project the actual 3D position to 2D normalized device coordinates (NDC)
        const vec = new THREE.Vector3().copy(groupRef.current.position);
        vec.project(camera);
        
        // Calculate screen space radius
        // Use 0.5 as radius3D to maintain exactly the same text wrapping as before
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

function Panel({ setTargetPosition }) {
  const { camera, size } = useThree()
  const [panelProps, setPanelProps] = useState({ args: [10, 10], position: [0, 0, 0] })

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
      
      setPanelProps({
        args: [width, depth],
        position: [0, 0, centerZ]
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
      <meshStandardMaterial color="#2e303a" roughness={0.8} />
    </mesh>
  )
}

export default function Scene({ setSpherePosition2D }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 5, 5]} onUpdate={(c) => c.lookAt(0, 0, 0)} fov={50} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Panel setTargetPosition={setTargetPosition} />
      <Goose targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />
    </Canvas>
  )
}

useGLTF.preload(gooseModelUrl)
