import { useState, useRef, useEffect } from 'react'
import TextColumn from './TextColumn'

const QUOTES = [
  { text: "Your story must reflect change over time. Stories that fail to reflect change over time are known as anecdotes.", citation: "Matthew Dicks, Storyworthy" },
  { text: "[]…and this is our job - to find the simplicity that lives at the heart of complexity.", citation: "Sandi Metz" },
  { text: "The seed of every habit is a single, tiny decision. But as that decision is repeated, a habit sprouts and grows stronger. Roots entrench themselves and branches grow. The task of breaking a bad habit is like uprooting a powerful oak within us. And the task of building a good habit is like cultivating a delicate flower one day at a time.", citation: "James Clear, Atomic Habits" },
  { text: "Honk.", citation: "Unknown Goose" },
  { text: "My number one goal is to make content that I'd myself be willing to watch.", citation: "Marques Brownlee" },
  { text: "Differences of habit and language are nothing at all if our aims are identical and our hearts are open.", citation: "Albus Dumbledore" },
];

export default function TextOverlay({ spherePosition2D }) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [colStartY, setColStartY] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    });

    observer.observe(containerRef.current);

    setDimensions({
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight
    });
    
    // Adjust start Y based on padding
    setColStartY(40);

    return () => observer.disconnect();
  }, [])

  let sphereInfo = null;

  if (spherePosition2D) {
    const pixelX = (spherePosition2D.x + 1) / 2 * dimensions.width;
    const pixelY = -(spherePosition2D.y - 1) / 2 * dimensions.height;
    const pixelR = spherePosition2D.r ? (spherePosition2D.r * (dimensions.width / 2)) : 0;
    sphereInfo = { x: pixelX, y: pixelY, r: pixelR };
  }

  // Scale the text dynamically so it fits in smaller hero section boxes
  const fontSize = Math.max(10, Math.min(18, dimensions.width / 50));
  const font = `bold ${fontSize}px 'Helvetica', 'Segoe UI', Roboto, sans-serif`
  const citationFont = `bold ${fontSize * 0.85}px 'Helvetica', 'Segoe UI', Roboto, sans-serif`
  const lineHeight = fontSize * 1.45

  const numColumns = 3;
  const gap = dimensions.width < 600 ? 20 : 40;
  const availableWidth = dimensions.width - 80; // Assuming 40px left and right padding
  const colWidth = Math.max(100, (availableWidth - gap * (numColumns - 1)) / numColumns);

  return (
    <div className="text-overlay" ref={containerRef} style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
      <div style={{ display: 'flex', gap: gap, maxWidth: '100%' }}>
        {Array.from({ length: numColumns }).map((_, colIndex) => {
          const colCenterX = 40 + colIndex * (colWidth + gap) + colWidth / 2;
          
          // Divide quotes among columns
          const quotesPerCol = Math.ceil(QUOTES.length / numColumns);
          const colQuotes = QUOTES.slice(colIndex * quotesPerCol, (colIndex + 1) * quotesPerCol);

          return (
            <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TextColumn
                quotes={colQuotes}
                maxWidth={colWidth}
                lineHeight={lineHeight}
                font={font}
                citationFont={citationFont}
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
