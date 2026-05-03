/**
 * Pie Chart Label Rendering with Collision Detection
 *
 * Custom label renderer for pie charts that prevents label overlap
 * by detecting collisions and adjusting Y positions accordingly.
 */

export interface LabelPosition {
  index: number;
  x: number;
  y: number;
  adjustedY: number;
  name: string;
  percentage: number;
  color: string;
  midAngle: number;
  isRight: boolean;
  cx: number;
  cy: number;
  outerRadius: number;
}

export interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  name?: string;
  payload?: { percentage: number; color: string };
  index?: number;
  allLabels: LabelPosition[];
  totalLabels: number;
}

/**
 * Renders custom labels for pie chart with collision detection
 *
 * Features:
 * - Labels positioned outside the pie with connector lines
 * - Automatic collision detection and adjustment
 * - Separate processing for left and right sides
 * - Elbow-style connector lines
 */
export function renderCustomLabel(props: CustomLabelProps) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = '', payload, index = 0, allLabels, totalLabels } = props;
  if (!payload) return null;
  const RADIAN = Math.PI / 180;

  // Determine which side of the chart this label is on
  const isRight = midAngle <= 90 || midAngle > 270;

  // Calculate base position - labels go straight out from center
  const labelRadius = outerRadius + 20;
  const baseX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
  const baseY = cy + labelRadius * Math.sin(-midAngle * RADIAN);

  // Store this label's base position
  allLabels[index] = {
    index,
    x: baseX,
    y: baseY,
    adjustedY: baseY, // Will be recalculated below
    name,
    percentage: payload.percentage,
    color: payload.color,
    midAngle,
    isRight,
    cx,
    cy,
    outerRadius,
  };

  // Only calculate final positions when all labels have been collected
  if (index < totalLabels - 1) {
    return null; // Don't render yet, wait for all labels
  }

  // Now all labels are collected, calculate adjusted positions and render all
  const minDistance = 16;

  // Process each side separately
  for (const side of [true, false]) {
    const sideLabels = allLabels
      .filter((l) => l && l.isRight === side)
      .sort((a, b) => a.y - b.y); // Sort by natural Y position (top to bottom)

    // Spread labels maintaining their order
    for (let i = 1; i < sideLabels.length; i++) {
      const prevLabel = sideLabels[i - 1];
      const currLabel = sideLabels[i];

      // If current label is too close to previous, push it down
      if (currLabel.adjustedY - prevLabel.adjustedY < minDistance) {
        currLabel.adjustedY = prevLabel.adjustedY + minDistance;
      }
    }
  }

  // Render all labels
  return (
    <g>
      {allLabels.map((label) => {
        if (!label) return null;

        const labelX = label.isRight ? label.cx + label.outerRadius + 35 : label.cx - label.outerRadius - 35;
        const textAnchor = label.isRight ? 'start' : 'end';

        // Line from pie edge to label
        const lineStartX = label.cx + (label.outerRadius + 5) * Math.cos(-label.midAngle * RADIAN);
        const lineStartY = label.cy + (label.outerRadius + 5) * Math.sin(-label.midAngle * RADIAN);

        // Midpoint for the elbow
        const elbowX = label.isRight ? label.cx + label.outerRadius + 25 : label.cx - label.outerRadius - 25;

        return (
          <g key={label.index}>
            {/* Connector line with elbow */}
            <path
              d={`M ${lineStartX},${lineStartY} L ${elbowX},${label.adjustedY} L ${labelX},${label.adjustedY}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1}
            />
            {/* Label text */}
            <text
              x={labelX}
              y={label.adjustedY}
              textAnchor={textAnchor}
              dominantBaseline="central"
              fill={label.color}
              fontSize={11}
              fontWeight={500}
            >
              {`${label.name}: ${label.percentage}%`}
            </text>
          </g>
        );
      })}
    </g>
  );
}
