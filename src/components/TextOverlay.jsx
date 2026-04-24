import { useState, useRef, useEffect } from 'react'
import TextColumn from './TextColumn'

const DUMMY_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

const DUMMY_PARAGRAPHS = [
  DUMMY_TEXT,
  "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
  "Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue.",
  DUMMY_TEXT
]
const FULL_TEXT = DUMMY_PARAGRAPHS.join('\n\n');

export default function TextOverlay({ spherePosition2D }) {
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
