import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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
      float windStrength = 0.4;
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

export default function Grass({ count = 100000, width = 30, depth = 30, centerZ = 0 }) {
  const meshRef = useRef();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  const geometry = useMemo(() => {
    // Simple plane for the blade, segmented for bending
    const geom = new THREE.PlaneGeometry(0.15, 0.15, 1, 1);
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
        dummy.rotation.y = Math.random() * Math.PI * 2;
        
        // Scale variation
        const scale = 0.95 + Math.random();
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