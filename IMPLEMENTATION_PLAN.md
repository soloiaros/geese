# Implementation Plan: High-Performance Ghibli-Style Grass Field

## 1. Overview
The goal is to implement a high-performance, stylized grass field by dropping the heavy `grass.glb` asset and adopting industry best practices for rendering dense foliage on the web. We will scatter simple `.fbx` mesh variations across a dynamically textured ground plane, utilizing alpha masking and GPU instancing to maximize frame rates while retaining a lush, painterly aesthetic. The `pretext` text overlay and all other overarching systems will remain completely untouched.

## 2. Technical Approach & Best Practices

### 2.1 Asset Pipeline (`useFBX` & `useTexture`)
- **Models**: We will load the provided FBX meshes (`Grass0.fbx`, `Grass1.fbx`, and their `_Low_LOD` variants) using `@react-three/drei`'s `useFBX` hook. 
- **Textures**: Ground and mask textures (`Grass_Albedo.png`, `GrassMask0.png`, `GrassMask1.png`) will be loaded via the `useTexture` hook. 

### 2.2 Textured Ground Plane
- The dynamically scaling `Panel` will no longer use a solid hex color. Instead, we will apply the `Grass_Albedo.png` texture to its `map` property.
- **Tiling**: Because the plane scales dynamically based on camera frustum intersections, we must configure the texture to tile seamlessly. We will set `texture.wrapS = texture.wrapT = THREE.RepeatWrapping` and dynamically adjust the `texture.repeat` vector based on the calculated plane dimensions to maintain a consistent pixel density.

### 2.3 Multi-Variational Instancing
To break up visual repetition without sacrificing performance, we will use multiple `THREE.InstancedMesh` components (one for each grass geometry variant: `Grass0` and `Grass1`).
- We will generate a single shared pool of transformation matrices (random X/Z positions within the plane bounds, random Y-rotations, and varied scales).
- We will split this matrix pool across the two (or more) `InstancedMesh` components, rendering them simultaneously. This allows for rich variation with only two draw calls.

### 2.4 Shading & Performance Optimization
- **Alpha Testing over Transparency**: Dense overlapping foliage causes massive GPU bottlenecks if standard transparency is used due to depth sorting. We will strictly use **Alpha Testing**. By applying `GrassMask0.png`/`GrassMask1.png` as an `alphaMap` and setting `alphaTest: 0.5` (with `transparent: false`), the GPU simply discards pixels below the alpha threshold, eliminating depth-sorting overhead entirely.
- **Unified Normals (Ghibli Shading)**: To prevent individual grass clumps from catching harsh, noisy shadows, we will override the geometry normals in the shader to point uniformly upwards `(0, 1, 0)`. This forces the lighting to treat the entire field as a single, soft, rolling surface, perfectly mimicking the Ghibli painted style.
- **Level of Detail (LOD)**: If performance requires further tuning, we will map the `_Low_LOD.fbx` models to matrices situated further from the camera, or simply fall back to the low LOD models entirely for dense populations.

### 2.5 GPU-Driven Wind (Vertex Shader)
- We will enhance a standard material (using `onBeforeCompile` or `THREE.CustomShaderMaterial`) to inject custom animation logic directly into the GPU pipeline.
- We will pass a `uTime` uniform updated via R3F's `useFrame`.
- In the vertex shader, we will isolate the top vertices of the grass by checking their local Y-coordinate. We will apply a sine-wave displacement to the X and Z axes based on the world coordinates and `uTime`, creating the illusion of wind gusts sweeping across the field.

## 3. Step-by-Step Implementation

1. **Asset Loading**:
   - Use `useFBX` to load `src/assets/3d/grass_models/Grass0.fbx` and `Grass1.fbx`.
   - Use `useTexture` to load `Grass_Albedo.png`, `GrassMask0.png`, and `GrassMask1.png`.

2. **Update the Ground Plane (`Panel`)**:
   - Apply the Albedo texture to the `meshStandardMaterial` map.
   - Inside the existing `useEffect` that calculates `args` (width/depth), calculate the corresponding UV repeat values and apply them to the texture to ensure consistent tiling.

3. **Generate Instance Distribution**:
   - Create a memoized array of `THREE.Matrix4` instances based on the plane's width and depth.
   - For every position generated, assign it to a pool for `Grass0` or a pool for `Grass1` (e.g., alternating or randomized).

4. **Develop the Grass Material**:
   - Create a base material configuration: `color: 'white'` (or a tint), `alphaMap: maskTexture`, `alphaTest: 0.5`, `side: THREE.DoubleSide`, `transparent: false`.
   - Apply `onBeforeCompile` to the material.
   - Inject the `uTime` uniform.
   - Inject the wind displacement algorithm into `#include <begin_vertex>`, multiplying the sway effect by `position.y` so the roots remain firmly attached to the ground.
   - Overwrite the `#include <beginnormal_vertex>` to set `objectNormal = vec3(0.0, 1.0, 0.0);` for soft shading.

5. **Scene Integration**:
   - Render the `InstancedMesh` components on top of the textured `Panel`.
   - Validate performance (FPS) and visually ensure the grass blends seamlessly with the Albedo ground plane.
   - Ensure the goose interaction (`onPointerMove`) remains smooth and accurate.