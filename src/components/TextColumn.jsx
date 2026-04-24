import { useMemo } from 'react'
import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '@chenglou/pretext'

export default function TextColumn({ text, maxWidth, lineHeight, font, colCenterX, colStartY, sphereInfo }) {
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
