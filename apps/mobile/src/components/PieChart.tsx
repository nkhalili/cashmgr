/**
 * PieChart Component
 *
 * Extracted from Dashboard screen to create a reusable analytics component.
 * Displays category data as an interactive SVG pie/donut chart with gradients.
 *
 * Features:
 * - Supports pie or donut chart styles
 * - Interactive slice selection with expansion animation
 * - Gradient fills with lighten effect
 * - Smart label positioning (only shows labels for slices >= 8%)
 * - Handles edge cases (empty data, single category)
 * - Theme-aware colors
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, LinearGradient, Stop, Defs, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@cashmgr/ui';

export interface PieChartData {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartData[];
  size?: number;
  innerRadius?: number; // Set to 0 for pie chart, > 0 for donut chart
  selectedId?: string | null;
  onSelectSlice?: (id: string) => void;
}

/**
 * Lighten a color by a given amount (0-1)
 */
function lightenColor(color: string, amount: number): string {
  // Remove # if present
  const hex = color.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighten each component
  const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount));

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * PieChart - Interactive pie/donut chart with gradients
 *
 * @example
 * ```tsx
 * <PieChart
 *   data={categoryData}
 *   size={280}
 *   innerRadius={70}
 *   selectedId={selectedCategoryId}
 *   onSelectSlice={setSelectedCategoryId}
 * />
 * ```
 */
export function PieChart({
  data,
  size = 280,
  innerRadius = 70,
  selectedId = null,
  onSelectSlice,
}: PieChartProps) {
  const theme = useTheme();

  // Handle empty data
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No data available
        </Text>
      </View>
    );
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Special case: single category (full circle)
  if (data.length === 1) {
    const item = data[0];
    const center = size / 2;
    const outerRadius = size / 2 - 10;
    const isSelected = selectedId === item.id;

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={`gradient-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={lightenColor(item.color, 0.3)} />
              <Stop offset="100%" stopColor={item.color} />
            </LinearGradient>
          </Defs>
          <G>
            <Path
              d={`
                M ${center},${center}
                m 0,-${outerRadius}
                a ${outerRadius},${outerRadius} 0 1,1 0,${outerRadius * 2}
                a ${outerRadius},${outerRadius} 0 1,1 0,-${outerRadius * 2}
                ${innerRadius > 0 ? `M ${center},${center - innerRadius}` : ''}
                ${innerRadius > 0 ? `a ${innerRadius},${innerRadius} 0 1,0 0,${innerRadius * 2}` : ''}
                ${innerRadius > 0 ? `a ${innerRadius},${innerRadius} 0 1,0 0,-${innerRadius * 2}` : ''}
                Z
              `}
              fill={`url(#gradient-${item.id})`}
              stroke={isSelected ? theme.colors.primary : 'transparent'}
              strokeWidth={isSelected ? 3 : 0}
            />
          </G>
        </Svg>
      </View>
    );
  }

  // Multiple categories - generate slices
  const center = size / 2;
  const outerRadius = size / 2 - 10;
  let currentAngle = -Math.PI / 2; // Start at top

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {data.map((item) => (
            <LinearGradient
              key={`gradient-${item.id}`}
              id={`gradient-${item.id}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={lightenColor(item.color, 0.3)} />
              <Stop offset="100%" stopColor={item.color} />
            </LinearGradient>
          ))}
        </Defs>

        {data.map((item) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 2 * Math.PI;
          const isSelected = selectedId === item.id;

          // Expand selected slice slightly
          const radiusOffset = isSelected ? 8 : 0;
          const effectiveOuterRadius = outerRadius + radiusOffset;
          const effectiveInnerRadius = innerRadius + radiusOffset;

          // Calculate slice path
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          const x1 = center + effectiveOuterRadius * Math.cos(startAngle);
          const y1 = center + effectiveOuterRadius * Math.sin(startAngle);
          const x2 = center + effectiveOuterRadius * Math.cos(endAngle);
          const y2 = center + effectiveOuterRadius * Math.sin(endAngle);

          const largeArcFlag = angle > Math.PI ? 1 : 0;

          let pathData: string;

          if (innerRadius > 0) {
            // Donut chart
            const x3 = center + effectiveInnerRadius * Math.cos(endAngle);
            const y3 = center + effectiveInnerRadius * Math.sin(endAngle);
            const x4 = center + effectiveInnerRadius * Math.cos(startAngle);
            const y4 = center + effectiveInnerRadius * Math.sin(startAngle);

            pathData = `
              M ${x1},${y1}
              A ${effectiveOuterRadius},${effectiveOuterRadius} 0 ${largeArcFlag},1 ${x2},${y2}
              L ${x3},${y3}
              A ${effectiveInnerRadius},${effectiveInnerRadius} 0 ${largeArcFlag},0 ${x4},${y4}
              Z
            `;
          } else {
            // Pie chart
            pathData = `
              M ${center},${center}
              L ${x1},${y1}
              A ${effectiveOuterRadius},${effectiveOuterRadius} 0 ${largeArcFlag},1 ${x2},${y2}
              Z
            `;
          }

          // Calculate label position (only for slices >= 8%)
          const showLabel = percentage >= 8;
          const labelAngle = startAngle + angle / 2;
          const labelRadius = (effectiveOuterRadius + effectiveInnerRadius) / 2;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);

          currentAngle = endAngle;

          return (
            <G key={item.id}>
              <Path
                d={pathData}
                fill={`url(#gradient-${item.id})`}
                stroke={isSelected ? theme.colors.primary : 'transparent'}
                strokeWidth={isSelected ? 3 : 0}
                onPress={() => onSelectSlice?.(item.id)}
              />
              {showLabel && (
                <>
                  {/* Text shadow for better readability */}
                  <SvgText
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={14}
                    fontWeight="600"
                    fill="#000"
                    opacity={0.3}
                    dy={1}
                    dx={1}
                  >
                    {percentage.toFixed(0)}%
                  </SvgText>
                  {/* Main label text */}
                  <SvgText
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={14}
                    fontWeight="600"
                    fill="#FFF"
                  >
                    {percentage.toFixed(0)}%
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
