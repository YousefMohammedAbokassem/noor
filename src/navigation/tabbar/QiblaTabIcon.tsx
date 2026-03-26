import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  color: string;
  size?: number;
  focused?: boolean;
};

export const QiblaTabIcon: React.FC<Props> = ({
  color,
  size = 22,
  focused = false,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    opacity={focused ? 1 : 0.92}
  >
    <Path
      d="M6.2 9.15L12 5.8l5.8 3.35-5.8 2.95-5.8-2.95Z"
      stroke={color}
      strokeWidth={1.45}
      strokeLinejoin="round"
    />
    <Path
      d="M6.2 9.15v7.35L12 20.2v-8.1L6.2 9.15Z"
      stroke={color}
      strokeWidth={1.45}
      strokeLinejoin="round"
    />
    <Path
      d="M17.8 9.15v7.35L12 20.2v-8.1l5.8-2.95Z"
      stroke={color}
      strokeWidth={1.45}
      strokeLinejoin="round"
    />
    <Rect
      x="10.45"
      y="12.65"
      width="3.1"
      height="5.05"
      rx="0.7"
      fill={color}
      opacity={0.94}
    />
    <Path
      d="M9.25 8.15h5.5"
      stroke={color}
      strokeWidth={1.15}
      strokeLinecap="round"
      opacity={0.75}
    />
  </Svg>
);
