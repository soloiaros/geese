# Implementation Plan: Replacing Sphere with Animated Goose

## Overview
The objective is to replace the simple 3D sphere primitive in the React Three Fiber scene with a glTF 2.0 animated model of a goose (`goose.glb`). The model will follow the cursor, play its moving animation only while in motion, and always face its direction of movement. Crucially, the text wrapping logic handled by the `@chenglou/pretext` npm module must remain perfectly intact and unaffected by this visual change.

## Step-by-Step Implementation Steps

### 1. Import Necessary Hooks and the Model
- In `src/components/Scene.jsx`, import `useGLTF` and `useAnimations` from `@react-three/drei`.
- Import the model URL using Vite's asset handling: `import gooseModelUrl from '../assets/3d/goose.glb'`.

### 2. Create the `Goose` Component
- Replace the existing `Sphere` component definition in `Scene.jsx` with a new `Goose` component.
- The `Goose` component will receive the identical props as the Sphere: `targetPosition` and `setSpherePosition2D`.
- Create a `ref` (e.g., `groupRef`) to hold the model's group for position and rotation updates.
- Load the model using the hook: `const { scene, animations } = useGLTF(gooseModelUrl)`.
- Extract animations using the hook: `const { actions, names } = useAnimations(animations, groupRef)`.

### 3. Implement Movement and Rotation Logic
- Inside the `Goose` component, utilize the `useFrame` hook to update position and rotation on every frame.
- **Positioning:** Retain the current lerp logic for smooth movement: `groupRef.current.position.lerp(targetVec, 5 * delta)`.
- **Direction & Rotation:**
  - Calculate the difference vector between the current position and the `targetVec` to determine the direction of movement.
  - If the distance (or squared length) of this vector is greater than a small epsilon (e.g., `0.001`), the object is considered "moving".
  - Calculate the target rotation angle using `Math.atan2(direction.x, direction.z)`.
  - Create a target quaternion from this angle and smoothly interpolate (`slerp`) the goose's current quaternion towards it. This ensures realistic, smooth turning.
  - If the distance is below the threshold (not moving), the rotation logic is bypassed, ensuring the goose preserves the exact rotation point it stopped at.

### 4. Implement Animation Logic
- Inside the same `useFrame` hook (or a `useEffect` if tracking a state, though `useFrame` is more synchronized), control the animation state based on movement.
- Retrieve the primary animation action (e.g., `const action = actions[names[0]]`).
- **When Moving:** If the distance to the target is above the threshold, ensure the action is playing (`action.play()`).
- **When Stopped:** If the distance falls below the threshold, halt the animation and reset it to frame 0 (e.g., `action.stop()` or setting `action.paused = true; action.time = 0;`).

### 5. Preserve Text Wrapping (`pretext` Integration)
- The existing `setSpherePosition2D` callback MUST be preserved exactly as it is to maintain the text wrapping functionality.
- Within `useFrame` of the `Goose` component, perform the same NDC (Normalized Device Coordinates) projection:
  - Project `groupRef.current.position` to screen space to obtain `vec.x` and `vec.y`.
  - Retain the `radius3D = 0.5` logic (or closely approximate the goose's bounding box size if necessary) to calculate `radiusNDC`. 
  - Call `setSpherePosition2D({ x: vec.x, y: vec.y, r: radiusNDC })` just like the `Sphere` component did. By keeping this identical, the `pretext` logic in `App.jsx` will continue to work flawlessly.

### 6. Update the Scene Integration
- In the `Scene` component's return statement, replace `<Sphere targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />` with `<Goose targetPosition={targetPosition} setSpherePosition2D={setSpherePosition2D} />`.
- Optionally, adjust the initial `position` or `scale` on the `<primitive object={scene} />` inside the `Goose` component if the imported model's default scale or origin differs significantly from the 1x1x1 sphere.

## Safety and Regression Checks
- **No changes to `App.jsx`**: The `TextOverlay` and `TextColumn` components must remain completely untouched to guarantee no disruption to the text layout system.
- **Dependency verification**: `@react-three/drei` is already in use (for `PerspectiveCamera`), so `useGLTF` and `useAnimations` are readily available.
- **Model Preloading**: Add `useGLTF.preload(gooseModelUrl)` outside the component to prevent any stuttering when the model first renders.
