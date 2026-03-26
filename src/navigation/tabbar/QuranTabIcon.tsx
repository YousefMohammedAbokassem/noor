import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  color: string;
  size?: number;
  focused?: boolean;
};

export const QuranTabIcon: React.FC<Props> = ({
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
      d="M4.75 6.25c1.55-.58 3.17-.87 4.87-.87 1.2 0 2.31.18 3.38.55v11.74c-1.07-.37-2.18-.55-3.38-.55-1.7 0-3.32.29-4.87.87V6.25Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path
      d="M19.25 6.25c-1.55-.58-3.17-.87-4.87-.87-1.2 0-2.31.18-3.38.55v11.74c1.07-.37 2.18-.55 3.38-.55 1.7 0 3.32.29 4.87.87V6.25Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path
      d="M12 6v11.8"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      opacity={0.9}
    />
    <Path
      d="M8.2 9.2c.75-.21 1.56-.32 2.43-.32"
      stroke={color}
      strokeWidth={1.25}
      strokeLinecap="round"
      opacity={0.72}
    />
    <Path
      d="M13.37 8.88c.75 0 1.57.11 2.43.32"
      stroke={color}
      strokeWidth={1.25}
      strokeLinecap="round"
      opacity={0.72}
    />
    <Path
      d="M8.2 11.72c.75-.2 1.56-.3 2.43-.3"
      stroke={color}
      strokeWidth={1.15}
      strokeLinecap="round"
      opacity={0.58}
    />
    <Path
      d="M13.37 11.42c.75 0 1.57.1 2.43.3"
      stroke={color}
      strokeWidth={1.15}
      strokeLinecap="round"
      opacity={0.58}
    />
    <Circle
      cx="12"
      cy="15.15"
      r="1.25"
      stroke={color}
      strokeWidth={1.2}
      opacity={0.9}
    />
    <Path
      d="M12 13.15l.33 1.05h1.1l-.89.64.34 1.06-.88-.66-.88.66.34-1.06-.89-.64h1.1l.33-1.05Z"
      fill={color}
      opacity={0.95}
    />
  </Svg>
);
