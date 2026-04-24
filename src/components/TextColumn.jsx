import { useMemo } from 'react'
import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '@chenglou/pretext'

export default function TextColumn({ quotes, maxWidth, lineHeight, font, citationFont, colCenterX, colStartY, sphereInfo }) {
  const preparedQuotes = useMemo(() => {
    return quotes.map(q => ({
      main: prepareWithSegments(`"${q.text}"`, font, { whiteSpace: 'pre-wrap' }),
      citation: prepareWithSegments(`(${q.citation})`, citationFont, { whiteSpace: 'pre-wrap' })
    }));
  }, [quotes, font, citationFont]);

  const lines = useMemo(() => {
    if (!preparedQuotes || preparedQuotes.length === 0) return [];
    
    let currentY = 0;
    const resultLines = [];

    const getLineConstraints = (y) => {
      const absY = colStartY + y;
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
      return { lineX, lineWidth };
    };

    for (const pq of preparedQuotes) {
      // Layout main text
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      while (true) {
        const { lineX, lineWidth } = getLineConstraints(currentY);
        
        if (lineWidth <= 0) {
          currentY += lineHeight;
          continue;
        }

        const range = layoutNextLineRange(pq.main, cursor, lineWidth);
        if (range === null) break;

        const line = materializeLineRange(pq.main, range);
        resultLines.push({ text: line.text, x: lineX, y: currentY, width: line.width, isCitation: false });
        
        cursor = range.end;
        currentY += lineHeight;
      }

      // Layout citation
      cursor = { segmentIndex: 0, graphemeIndex: 0 };
      while (true) {
        const { lineX, lineWidth } = getLineConstraints(currentY);
        
        if (lineWidth <= 0) {
          currentY += lineHeight;
          continue;
        }

        const range = layoutNextLineRange(pq.citation, cursor, lineWidth);
        if (range === null) break;

        const line = materializeLineRange(pq.citation, range);
        
        // Right-align citation within the available line width
        const citationX = lineX + Math.max(0, lineWidth - line.width);
        
        resultLines.push({ text: line.text, x: citationX, y: currentY, width: line.width, isCitation: true });
        
        cursor = range.end;
        currentY += lineHeight;
      }

      currentY += lineHeight * 3; // extra gap between quotes
    }
    return resultLines;
  }, [preparedQuotes, maxWidth, lineHeight, sphereInfo, colCenterX, colStartY]);

  return (
    <div style={{ width: maxWidth, height: lines.length ? lines[lines.length - 1].y + lineHeight : 0, position: 'relative', overflow: 'hidden', color: 'var(--text-h)' }}>
      {lines.map((line, i) => (
        <div 
          key={i} 
          style={{ 
            position: 'absolute', 
            top: line.y, 
            left: line.x, 
            width: line.width, 
            whiteSpace: 'pre',
            font: line.isCitation ? citationFont : font,
            color: 'var(--text-h)',
            opacity: line.isCitation ? 0.7 : 1
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  )
}