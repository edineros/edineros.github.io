import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
  percentage?: number;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string;
  onSegmentHover?: (segment: DonutSegment | null, index: number | null) => void;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 24,
  backgroundColor = '#1F1F1F',
  onSegmentHover,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate total value
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  if (total === 0) {
    // Empty state - just show the background ring
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Path
            d={describeArc(center, center, radius, 0, 359.99)}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />
        </Svg>
      </View>
    );
  }

  // Calculate segment angles
  let currentAngle = -90; // Start from top
  const segmentPaths = segments
    .filter((seg) => seg.value > 0)
    .map((segment) => {
      const segmentAngle = (segment.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;
      currentAngle = endAngle;

      // Add small gap between segments (1 degree)
      const adjustedEnd = segmentAngle > 2 ? endAngle - 1 : endAngle;

      return {
        ...segment,
        startAngle,
        endAngle: adjustedEnd,
      };
    });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Path
          d={describeArc(center, center, radius, 0, 359.99)}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Segment arcs */}
        <G>
          {segmentPaths.map((segment, index) => (
            <Path
              key={index}
              d={describeArc(center, center, radius, segment.startAngle, segment.endAngle)}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

// Helper function to describe an arc path
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
