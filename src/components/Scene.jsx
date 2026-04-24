import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, useGLTF, useAnimations, Center } from '@react-three/drei'
import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

import gooseModelUrl from '../assets/3d/goose.glb'

// --- GRASS SHADERS ---
const grassVertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vUv = uv;
    vec3 transformed = position;
    
    // Taper the grass blade to a point at the top
    transformed.x *= (1.0 - vUv.y);
    
    #ifdef USE_INSTANCING
      vec3 worldPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      
      // Wind based on 2D noise
      float noiseValue = noise(worldPos.xz * 0.2 + uTime * 0.5);
      float windStrength = 0.3;
      float heightFactor = max(0.0, position.y); // Bend only the top
      
      vec3 windDisplacement = vec3(
        cos(uTime + worldPos.x) * noiseValue * windStrength,
        0.0,
        sin(uTime + worldPos.z) * noiseValue * windStrength
      );
      
      transformed += windDisplacement * heightFactor;
    #endif

    #ifdef USE_INSTANCING
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
    #else
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    #endif
  }
`;

const grassFragmentShader = `
  varying vec2 vUv;

  void main() {
    vec3 bottomColor = vec3(0.05, 0.20, 0.05); // Darker green at base
    vec3 topColor = vec3(0.3, 0.6, 0.2); // Brighter green at tip
    vec3 color = mix(bottomColor, topColor, vUv.y);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- GRASS COMPONENT ---
function Grass({ count = 100000, width = 30, depth = 30, centerZ = 0 }) {
  const meshRef = useRef();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  const geometry = useMemo(() => {
    // Simple plane for the blade, segmented for bending
    const geom = new THREE.PlaneGeometry(0.12, 0.15, 1, 1);
    geom.translate(0, 0.075, 0); // Shift origin to the bottom of the blade
    return geom;
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set(
          (Math.random() - 0.5) * width,
          0,
          (Math.random() - 0.5) * depth + centerZ
        );
        dummy.rotation.y = Math.random() * Math.PI;
        
        // Scale variation
        const scale = 0.8 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);
        
        // Slight initial lean to make it organic
        dummy.rotation.x = (Math.random() - 0.5) * 0.2;
        dummy.rotation.z = (Math.random() - 0.5) * 0.2;

        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, width, depth, centerZ]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, null, count]}>
      <shaderMaterial 
        uniforms={uniforms}
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// --- GOOSE COMPONENT ---
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

// --- GROUND AND GRASS COMPONENT ---
function GroundAndGrass({ setTargetPosition }) {
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

  // Calculate density based on visible area
  const area = panelProps.args[0] * panelProps.args[1];
  const count = Math.min(Math.floor(area * 500), 100000); // 500 blades per sq unit, max 100k

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={panelProps.position}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={panelProps.args} />
        {/* Adjusted ground color to blend with grass base */}
        <meshStandardMaterial color="#0a1a0a" roughness={0.8} />
      </mesh>
      
      <Grass 
        count={count} 
        width={panelProps.args[0]} 
        depth={panelProps.args[1]} 
        centerZ={panelProps.position[2]} 
      />
    </group>
  )
}

export default function Scene({ setSpherePosition2D }) {
  const [targetPosition, setTargetPosition] = useState([0, 0.5, 0])

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 5, 5]} onUpdate={(c) => c.lookAt(0, 0, 0)} fov={50} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <GroundAndGrass setTargetPosition={setTargetPosition} />
      <Goose targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />
    </Canvas>
  )
}