import { useState, useMemo, useRef, useEffect } from 'react'
import { prepare, layout } from '@chenglou/pretext'
import Scene from './Scene.jsx'
import '../App.css'

const DUMMY_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

const DUMMY_PARAGRAPHS = [
  DUMMY_TEXT,
  "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
  "Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue.",
  DUMMY_TEXT
]

function TextColumn({ text, maxWidth, lineHeight, font, distanceToSphere }) {
  const prepared = useMemo(() => prepare(text, font), [text, font])

  // Adjust max width dynamically based on distance to the sphere.
  // If the sphere is close to this column, shrink its max width.
  // This gives an effect of the sphere pushing the text.
  let dynamicMaxWidth = maxWidth;
  if (distanceToSphere !== null && distanceToSphere < 200) {
    // If distance is less than 200px, shrink width by up to 100px.
    const shrinkAmount = Math.max(0, 100 * (1 - distanceToSphere / 200));
    dynamicMaxWidth = Math.max(100, maxWidth - shrinkAmount);
  }

  const result = layout(prepared, dynamicMaxWidth, lineHeight)
  const lines = result.lines || result; // check if it's an array directly or an object with lines
  console.log("pretext layout result:", result);

  return (
    <div style={{ width: dynamicMaxWidth, height: result.height || (lines.length * lineHeight), position: 'relative', overflow: 'hidden', transition: 'width 0.1s ease-out' }}>
      {Array.isArray(lines) && lines.map((line, i) => (
        <div key={i} style={{ position: 'absolute', top: line.y || (i * lineHeight) }}>
          {line.text || line}
        </div>
      ))}
    </div>
  )
}

function TextOverlay({ spherePosition2D }) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Map NDC to screen coordinates
  let spherePixelX = null;
  let spherePixelY = null;

  if (spherePosition2D) {
    spherePixelX = (spherePosition2D.x + 1) / 2 * dimensions.width;
    spherePixelY = -(spherePosition2D.y - 1) / 2 * dimensions.height;
  }

  // Pretext configuration
  const font = "18px system-ui, 'Segoe UI', Roboto, sans-serif"
  const lineHeight = 18 * 1.45

  // Render 3 columns
  const numColumns = 3;
  const gap = 40;
  const availableWidth = dimensions.width - 80; // 40px padding on left/right
  const colWidth = Math.max(150, (availableWidth - gap * (numColumns - 1)) / numColumns);

  // Simple distance calculation for columns (approximated to center of column)
  const calculateDistance = (colIndex) => {
    if (spherePixelX === null || spherePixelY === null) return null;
    const colCenterX = 40 + colIndex * (colWidth + gap) + colWidth / 2;
    // Just measuring X distance for simplicity, can include Y as well
    const dx = spherePixelX - colCenterX;
    const dy = spherePixelY - (dimensions.height / 2); // approximate center Y
    return Math.sqrt(dx * dx + dy * dy);
  }

  return (
    <div className="text-overlay" ref={containerRef}>
      <div style={{ display: 'flex', gap: gap, maxWidth: '100%', alignItems: 'center' }}>
        {Array.from({ length: numColumns }).map((_, colIndex) => {
          const distance = calculateDistance(colIndex);
          return (
            <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {DUMMY_PARAGRAPHS.map((p, i) => (
                <TextColumn
                  key={i}
                  text={p}
                  maxWidth={colWidth}
                  lineHeight={lineHeight}
                  font={font}
                  distanceToSphere={distance}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function App() {
  const [spherePosition2D, setSpherePosition2D] = useState(null)

  return (
    <>
      <div className="canvas-container">
        <Scene setSpherePosition2D={setSpherePosition2D} />
      </div>
      <TextOverlay spherePosition2D={spherePosition2D} />
    </>
  )
}

export default App
