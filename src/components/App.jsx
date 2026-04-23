import { useState, useMemo, useRef, useEffect } from 'react'
import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '@chenglou/pretext'
import Scene from './Scene.jsx'
import '../App.css'

const DUMMY_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

const DUMMY_PARAGRAPHS = [
  DUMMY_TEXT,
  "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
  "Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue.",
  DUMMY_TEXT
]
const FULL_TEXT = DUMMY_PARAGRAPHS.join('\n\n');

function TextColumn({ text, maxWidth, lineHeight, font, colCenterX, colStartY, sphereInfo }) {
  const prepared = useMemo(() => prepareWithSegments(text, font, { whiteSpace: 'pre-wrap' }), [text, font])

  const lines = useMemo(() => {
    if (!prepared) return [];
    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let currentY = 0
    const resultLines = []

    while (true) {
      const absY = colStartY + currentY;
      
      let lineWidth = maxWidth;
      let lineX = 0;

      if (sphereInfo && sphereInfo.r > 0) {
        const lineCenterY = absY + lineHeight / 2;
        const dy = lineCenterY - sphereInfo.y;
        const paddedRadius = sphereInfo.r + 20;

        if (Math.abs(dy) < paddedRadius) {
          const chordRadius = Math.sqrt(paddedRadius * paddedRadius - dy * dy);
          const sphereLeft = sphereInfo.x - chordRadius;
          const sphereRight = sphereInfo.x + chordRadius;

          const colAbsLeft = colCenterX - maxWidth / 2;
          const colAbsRight = colCenterX + maxWidth / 2;

          const overlapLeft = Math.max(colAbsLeft, sphereLeft);
          const overlapRight = Math.min(colAbsRight, sphereRight);

          if (overlapLeft < overlapRight) {
            const spaceLeft = overlapLeft - colAbsLeft;
            const spaceRight = colAbsRight - overlapRight;

            if (spaceLeft > spaceRight && spaceLeft > 50) {
              lineX = 0;
              lineWidth = spaceLeft - 10;
            } else if (spaceRight >= spaceLeft && spaceRight > 50) {
              lineX = (overlapRight - colAbsLeft) + 10;
              lineWidth = spaceRight - 10;
            } else {
              lineWidth = 0; 
            }
          }
        }
      }
      
      if (lineWidth <= 0) {
        currentY += lineHeight;
        continue;
      }

      const range = layoutNextLineRange(prepared, cursor, lineWidth)
      if (range === null) break

      const line = materializeLineRange(prepared, range)
      resultLines.push({ text: line.text, x: lineX, y: currentY, width: line.width })
      
      cursor = range.end
      currentY += lineHeight
    }
    return resultLines;
  }, [prepared, maxWidth, lineHeight, sphereInfo, colCenterX, colStartY])

  return (
    <div style={{ width: maxWidth, height: lines.length ? lines[lines.length - 1].y + lineHeight : 0, position: 'relative', overflow: 'hidden' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ position: 'absolute', top: line.y, left: line.x, width: line.width, whiteSpace: 'pre' }}>
          {line.text}
        </div>
      ))}
    </div>
  )
}

function TextOverlay({ spherePosition2D }) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [colStartY, setColStartY] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
      setColStartY(100)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  let sphereInfo = null;

  if (spherePosition2D) {
    const pixelX = (spherePosition2D.x + 1) / 2 * dimensions.width;
    const pixelY = -(spherePosition2D.y - 1) / 2 * dimensions.height;
    const pixelR = spherePosition2D.r ? (spherePosition2D.r * (dimensions.width / 2)) : 0;
    sphereInfo = { x: pixelX, y: pixelY, r: pixelR };
  }

  const font = "18px system-ui, 'Segoe UI', Roboto, sans-serif"
  const lineHeight = 18 * 1.45

  const numColumns = 3;
  const gap = 40;
  const availableWidth = dimensions.width - 80;
  const colWidth = Math.max(150, (availableWidth - gap * (numColumns - 1)) / numColumns);

  return (
    <div className="text-overlay" ref={containerRef} style={{ alignItems: 'flex-start', paddingTop: '100px' }}>
      <div style={{ display: 'flex', gap: gap, maxWidth: '100%' }}>
        {Array.from({ length: numColumns }).map((_, colIndex) => {
          const colCenterX = 40 + colIndex * (colWidth + gap) + colWidth / 2;
          return (
            <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TextColumn
                text={FULL_TEXT}
                maxWidth={colWidth}
                lineHeight={lineHeight}
                font={font}
                colCenterX={colCenterX}
                colStartY={colStartY}
                sphereInfo={sphereInfo}
              />
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

