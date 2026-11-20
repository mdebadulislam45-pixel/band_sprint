import React from 'react';

interface BandSprintMarkProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'default';
}

export const BandSprintMark: React.FC<BandSprintMarkProps> = ({
  className = '',
  size = 32,
  variant = 'default'
}) => {
  const leftFill = variant === 'dark' ? '#EEF3F1' : '#0F4C45';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left face */}
      <path
        d="M8 86 L48 12 C36 38 60 56 44 86 Z"
        fill={leftFill}
      />
      {/* Right face */}
      <path
        d="M48 12 L88 86 L44 86 C60 56 36 38 48 12 Z"
        fill="#F4A62A"
      />
    </svg>
  );
};
