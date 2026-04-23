import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import grass0Url from '../assets/3d/grass_models/Grass0.fbx'
import grass1Url from '../assets/3d/grass_models/Grass1.fbx'
import mask0Url from '../assets/3d/grass_textures/GrassMask0.png'
import mask1Url from '../assets/3d/grass_textures/GrassMask1.png'

export default function GrassField({ width, depth }) {
  const fbx0 = useFBX(grass0Url)
  const fbx1 = useFBX(grass1Url)
  const mask0 = useTexture(mask0Url)
  const mask1 = useTexture(mask1Url)

  const geo0 = fbx0.children[0].geometry
  const geo1 = fbx1.children[0].geometry

  // Determine number of instances based on area to keep density consistent
  const area = width * depth
  const count = Math.max(1, Math.floor(area * 30)) // density multiplier
  const halfCount = Math.floor(count / 2)

  const [matrices0, setMatrices0] = React.useState([])
  const [matrices1, setMatrices1] = React.useState([])

  useEffect(() => {
    const arr0 = []
    const dummy0 = new THREE.Object3D()
    for (let i = 0; i < halfCount; i++) {
      dummy0.position.set(
        (Math.random() - 0.5) * width,
        0,
        (Math.random() - 0.5) * depth
      )
      dummy0.rotation.y = Math.random() * Math.PI * 2
      const scale = 0.4 + Math.random() * 0.4
      dummy0.scale.set(scale, scale, scale)
      dummy0.updateMatrix()
      arr0.push(dummy0.matrix.clone())
    }

    const arr1 = []
    const dummy1 = new THREE.Object3D()
    for (let i = 0; i < count - halfCount; i++) {
      dummy1.position.set(
        (Math.random() - 0.5) * width,
        0,
        (Math.random() - 0.5) * depth
      )
      dummy1.rotation.y = Math.random() * Math.PI * 2
      const scale = 0.4 + Math.random() * 0.4
      dummy1.scale.set(scale, scale, scale)
      dummy1.updateMatrix()
      arr1.push(dummy1.matrix.clone())
    }

    // Defer state update to avoid synchronous state update warning
    requestAnimationFrame(() => {
      setMatrices0(arr0)
      setMatrices1(arr1)
    })
  }, [width, depth, count, halfCount])

  const mesh0Ref = useRef()
  const mesh1Ref = useRef()

  const customUniformsRef = useRef({
    uTime: { value: 0 }
  })

  useFrame((state) => {
    if (customUniformsRef.current) {
      customUniformsRef.current.uTime.value = state.clock.elapsedTime
    }
  })

  useEffect(() => {
    if (mesh0Ref.current) {
      matrices0.forEach((m, i) => mesh0Ref.current.setMatrixAt(i, m))
      mesh0Ref.current.instanceMatrix.needsUpdate = true
    }
    if (mesh1Ref.current) {
      matrices1.forEach((m, i) => mesh1Ref.current.setMatrixAt(i, m))
      mesh1Ref.current.instanceMatrix.needsUpdate = true
    }
  }, [matrices0, matrices1])

  const onBeforeCompile = (shader) => {
    shader.uniforms.uTime = customUniformsRef.current.uTime
    shader.vertexShader = `
      uniform float uTime;
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      // Ghibli style soft normals (pointing straight up)
      objectNormal = vec3(0.0, 1.0, 0.0);
      `
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      // Calculate world position for wind effect
      vec4 windWorldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

      // Wind animation (only affect top vertices by multiplying with position.y)
      // Multiply by position.y to keep roots fixed to ground
      float windPower = 0.15;
      float windFrequency = 1.5;

      // Add some variation based on world position X and Z
      float windOffset = windWorldPos.x * 0.2 + windWorldPos.z * 0.2;
      float wind = sin(uTime * windFrequency + windOffset) * windPower;

      // Apply wind displacement
      // Note: In local space for InstancedMesh with panel rotated by PI/2, y is up
      transformed.x += wind * position.y;
      transformed.z += wind * position.y * 0.5;
      `
    )
  }

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <instancedMesh ref={mesh0Ref} args={[geo0, null, halfCount]}>
        <meshStandardMaterial
          color="#a1cd73" // Base grass tint
          alphaMap={mask0}
          alphaTest={0.5}
          transparent={false}
          side={THREE.DoubleSide}
          onBeforeCompile={onBeforeCompile}
        />
      </instancedMesh>
      <instancedMesh ref={mesh1Ref} args={[geo1, null, count - halfCount]}>
        <meshStandardMaterial
          color="#a1cd73"
          alphaMap={mask1}
          alphaTest={0.5}
          transparent={false}
          side={THREE.DoubleSide}
          onBeforeCompile={onBeforeCompile}
        />
      </instancedMesh>
    </group>
  )
}
