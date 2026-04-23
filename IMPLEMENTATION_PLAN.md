# Implementation Plan: Interactive 3D Web Page - Phase 2

This document outlines the implementation plan for the second phase of the interactive 3D web page, focusing on precise 3D plane positioning, text visibility, and dynamic text wrapping around a 3D object using the `pretext` library.

## 1. Text Visibility and Layering

**Goal:** Ensure the text is pure white and clearly visible above the 3D scene.

*   **Action:** Update the CSS for the text container (e.g., `.text-overlay`) and the text components.
*   **Implementation:**
    *   Set the text color explicitly to white: `color: #ffffff;`.
    *   Ensure the `.text-overlay` has a higher `z-index` than the canvas container.
    *   Optionally add a subtle `text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.8);` to guarantee the white text remains legible even if the 3D sphere passes directly behind it and shares a light color.

## 2. Precise Panel Positioning (Frustum Alignment)

**Goal:** Position the 3D panel so its farthest points exactly match the top-left and top-right corners of the screen. The closest points will naturally stretch beyond the screen limits on the X-axis due to perspective.

*   **Concept:** We need to calculate the exact dimensions and position of a plane on the XZ axis (`Y=0`) so that its far edge aligns with the top of the camera's view frustum.
*   **Implementation steps:**
    1.  **Raycasting from Screen Corners:** Inside the `Scene` component, use the camera to unproject the Normalized Device Coordinates (NDC) of the screen's top corners (`[-1, 1, 0]` and `[1, 1, 0]`) and bottom corners (`[-1, -1, 0]` and `[1, -1, 0]`).
    2.  **Intersection with Ground Plane:** Cast mathematical rays from the camera's position through these unprojected points to see where they intersect the `Y=0` plane.
    3.  **Calculate Dimensions:**
        *   The distance between the top-left and top-right intersections determines the exact **width** of the panel's far edge.
        *   The Z-distance between the top intersections and bottom intersections determines the **depth** (height) of the panel.
    4.  **Apply to Geometry:** Create a standard `<planeGeometry args={[width, depth]}>` (or use a custom trapezoid/custom plane if we want a standard rectangle that stretches out) and position it so the far edge rests exactly on the Z-coordinate of the top intersections.
    5.  *Result:* The plane will perfectly fill the screen vertically, its top edge will perfectly align with the top corners, and its bottom edge will be wider than the screen.

## 3. Dynamic Text Wrapping (Avoid Intersection)

**Goal:** The text must wrap around the sphere. The sphere should never intersect the text; instead, the text lines should adjust their layout to avoid the sphere's 2D projected area.

*   **Concept:** Instead of just shrinking the entire column's `maxWidth`, we need to compute exclusion zones line-by-line based on the sphere's current position and radius on the screen.
*   **Implementation steps:**
    1.  **Calculate 2D Sphere Radius:** In addition to tracking `spherePosition2D` (the X, Y screen coordinates), project a point at the edge of the sphere (e.g., `position.clone().add(new THREE.Vector3(radius, 0, 0))`) to determine the 2D radius in pixels on the screen.
    2.  **Line-by-Line Intersection Logic:** Inside the text rendering logic (using `@chenglou/pretext`), we must determine where each line falls on the Y-axis.
    3.  **Exclusion Calculation:** For each line at `lineY`:
        *   Check if `lineY` falls within the sphere's vertical bounds: `Math.abs(lineY - sphereY) < radius2D`.
        *   If it does, calculate the horizontal slice (chord) of the sphere at that Y-coordinate: `chordWidth = Math.sqrt(radius2D**2 - (lineY - sphereY)**2)`.
        *   The sphere acts as an obstacle spanning `[sphereX - chordWidth - padding, sphereX + chordWidth + padding]`.
    4.  **Adjusting Line Layout:**
        *   If the sphere is overlapping a text column on a specific line, adjust the `maxWidth` or `x` offset for that specific line.
        *   For instance, if the sphere is on the left side of the column, push the starting `x` coordinate of the text line to the right (`sphereX + chordWidth`) and reduce its available width.
        *   If the sphere is in the middle of a column, the layout engine may need to split the line into two separate text blocks (one on the left, one on the right), or push all text to the side with the most available space.
    5.  **Integration with Pretext:** Depending on the capabilities of `@chenglou/pretext`, pass this dynamic exclusion zone array to its layout function on every frame/update. If it doesn't natively support dynamic per-line obstacles, implement a wrapper around `pretext.layout` that measures words and manually breaks lines when they encounter the calculated 2D exclusion zone.

## 4. Execution Order

1.  Apply CSS updates to make the text white and verify layering (`z-index`).
2.  Implement the camera frustum intersection math in `Scene.jsx` to dynamically size and position the `Panel` mesh on load and window resize.
3.  Update the sphere tracking to pass both 2D center coordinates and 2D pixel radius to the text overlay.
4.  Rewrite the `TextColumn` logic to calculate per-line intersections and dynamically adjust the positioning/width of individual text lines, utilizing `pretext` for word measurement and wrapping.