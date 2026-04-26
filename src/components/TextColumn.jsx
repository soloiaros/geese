import { useMemo } from 'react'
import { prepareWithSegments, layoutNextLineRange, materializeLineRange } from '@chenglou/pretext'

export default function TextColumn({ quotes, maxWidth, lineHeight, font, citationFont, colCenterX, colStartY, geeseInfo }) {
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
      const lineCenterY = absY + lineHeight / 2;

      const colAbsLeft = colCenterX - maxWidth / 2;
      const colAbsRight = colCenterX + maxWidth / 2;

      // Start with the full width
      let currentLineLeft = colAbsLeft;
      let currentLineRight = colAbsRight;

      if (geeseInfo && geeseInfo.length > 0) {
        for (const goose of geeseInfo) {
          if (goose.r <= 0) continue;

          const dy = lineCenterY - goose.y;
          const paddedRadius = goose.r + 20;

          if (Math.abs(dy) < paddedRadius) {
            const chordRadius = Math.sqrt(paddedRadius * paddedRadius - dy * dy);
            const sphereLeft = goose.x - chordRadius;
            const sphereRight = goose.x + chordRadius;

            // Check if this goose overlaps with the current column
            const overlapLeft = Math.max(colAbsLeft, sphereLeft);
            const overlapRight = Math.min(colAbsRight, sphereRight);

            if (overlapLeft < overlapRight) {
              // The goose is definitely in the way of this column at this Y
              const spaceLeft = overlapLeft - colAbsLeft;
              const spaceRight = colAbsRight - overlapRight;

              // We need to decide which side to keep. 
              // To handle multiple geese, this is tricky. 
              // A simpler approach: if a goose is "mostly" on the left, keep the right side.
              // If it's mostly on the right, keep the left side.
              // If it blocks too much of both, we might need to set width to 0.

              if (spaceLeft > spaceRight) {
                // Keep left side, so pull in the right boundary
                currentLineRight = Math.min(currentLineRight, overlapLeft - 10);
              } else {
                // Keep right side, so pull in the left boundary
                currentLineLeft = Math.max(currentLineLeft, overlapRight + 10);
              }
            }
          }
        }
      }

      let lineWidth = currentLineRight - currentLineLeft;
      let lineX = currentLineLeft - colAbsLeft;

      if (lineWidth < 50) {
        lineWidth = 0;
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
  }, [preparedQuotes, maxWidth, lineHeight, geeseInfo, colCenterX, colStartY]);

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