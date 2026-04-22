# Implementation Plan: Interactive 3D Web Page

This document outlines the step-by-step implementation of the interactive 3D web page, featuring a 3D scene with a floating panel, an organically moving sphere, and dynamic text layout using the `pretext` library.

## Technology Stack

*   **Build Tool & Framework:** Vite + React (Already initialized).
*   **3D Library:** **React Three Fiber (R3F)** (`@react-three/fiber`) and **Three.js** (`three`).
    *   *Why R3F?* It provides a declarative, component-based approach to Three.js that integrates seamlessly with React state and effects. It handles the render loop, scene management, and raycasting out of the box. Crucially, swapping out primitive shapes (like our sphere and panel) for complex, animated `.gltf` or `.glb` models later is incredibly straightforward using R3F's `useGLTF` and `@react-three/drei` helpers.
*   **3D Helpers:** `@react-three/drei` (For easy camera controls, environment setup, and utility components).
*   **Animation/Interpolation:** Three.js built-in math (`THREE.MathUtils.damp3`) or `framer-motion-3d` for the organic movement. We will use `MathUtils.damp3` inside a `useFrame` hook for lightweight, spring-like organic movement.
*   **Text Layout:** `pretext` npm module (as requested, for layout manipulation based on the sphere's position).

---

## Step-by-Step Implementation

### Step 1: Install Dependencies
First, we need to install the necessary 3D and text manipulation libraries.

```bash
npm install three @react-three/fiber @react-three/drei
npm install pretext
```

### Step 2: Global Styles & Dark Theme Setup
Update `src/index.css` and `src/App.css` to ensure the application takes up the full screen and uses a dark color palette.

*   Set `body`, `html`, and `#root` to `height: 100vh`, `width: 100vw`, `margin: 0`, `overflow: hidden`.
*   Set a dark background color (e.g., `#121212` or `#0a0a0a`).
*   Ensure the canvas container is positioned absolutely or takes up the full dimensions behind the text layer.

### Step 3: Setting up the 3D Canvas and Camera
Create a new component (e.g., `Scene.jsx`) to house the R3F `<Canvas>`.

*   **Camera:** Configure a `PerspectiveCamera` positioned to look down at a roughly 45-degree angle.
    *   Example position: `[0, 10, 10]` looking at `[0, 0, 0]`.
*   **Lighting:** Add ambient light and a directional light to make the 3D objects distinguishable from the dark background. The objects should have slightly lighter materials (e.g., `#333333` for the panel, `#666666` or a subtle glowing color for the sphere).

### Step 4: Creating the Floating Panel and Sphere
Inside the `Scene`, create two primary mesh components:

*   **Floating Panel:** A flat `<boxGeometry>` or `<planeGeometry>` rotated to lay flat on the XZ axis (`rotation={[-Math.PI / 2, 0, 0]}`). Give it a dark, slightly reflective material.
*   **The Sphere:** A `<sphereGeometry>` placed slightly above the panel.

### Step 5: Implementing Raycasting & Organic Movement
R3F handles raycasting natively through pointer events on meshes.

1.  **State Management:** Create a React ref or state to store the target position of the sphere (defaulting to the center `[0, radius, 0]`).
2.  **Pointer Events:** Attach an `onPointerMove` event to the **Floating Panel** mesh.
    *   When the cursor moves over the panel, extract the exact 3D intersection point (`event.point`).
    *   Update the target position with this point (keeping the Y-axis constant so the sphere rolls/slides *on top* of the panel).
3.  **Organic Motion:** Use the `useFrame` hook on the Sphere component.
    *   On every frame, smoothly interpolate (lerp or damp) the sphere's current position towards the target position using `THREE.MathUtils.damp3(ref.current.position, targetPosition, lambda, delta)`. This creates the organic, "following NPC" feel.
4.  **Preserving Position:** Because we only update the target position on `onPointerMove` over the panel, when the cursor leaves the panel, the target position remains at the last known intersection, and the sphere will stay there.

### Step 6: Integrating the `pretext` Module
Layer the text UI on top of the 3D canvas using CSS (absolute positioning, z-index).

1.  **Text Overlay:** Create an HTML overlay component that renders columns of dummy text.
2.  **Tracking the Sphere (2D Projection):** To make the `pretext` layout react to the sphere, we need the sphere's position in 2D screen space.
    *   We can project the 3D sphere position to 2D screen coordinates using the camera projection matrix, or simply track the 2D mouse position if it closely maps to the sphere's target.
    *   R3F's `useThree` hook allows us to access the camera and project the 3D vector to normalized device coordinates (NDC), which we then map to pixel coordinates.
3.  **Applying `pretext`:** Pass these 2D coordinates (or the active repelling radius) into the `pretext` API to calculate the text wrapping/displacement around the active area.

### Step 7: Preparing for Future 3D Models
To ensure the project is ready for actual animated 3D models later:

*   Keep the logic for the "Agent" (currently the sphere) abstracted in its own component (e.g., `<Agent position={...} />`).
*   When models are ready, you will replace `<mesh><sphereGeometry /></mesh>` with the loaded model:
    ```jsx
    import { useGLTF, useAnimations } from '@react-three/drei';

    export function Agent(props) {
      const { scene, animations } = useGLTF('/path/to/character.glb');
      const { actions } = useAnimations(animations, scene);
      
      // Play walking animation when distance to target is > threshold
      // Play idle animation when distance is near 0
      
      return <primitive object={scene} {...props} />;
    }
    ```
*   The organic movement logic (`MathUtils.damp3`) will remain exactly the same; it will just move the `<primitive>` wrapper instead of a basic mesh.

---

## Execution Order
1. Setup global CSS and dark theme.
2. Build the basic R3F Canvas with Lighting and Camera.
3. Render the static Panel and Sphere meshes.
4. Implement `onPointerMove` raycasting and `useFrame` smooth interpolation.
5. Create the HTML overlay.
6. Connect the Sphere's screen-space position to the `pretext` layout logic.