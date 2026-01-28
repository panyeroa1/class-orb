
import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-10", iconOnly = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <svg
        viewBox={iconOnly ? "0 0 140 150" : "0 0 450 150"}
        className="h-full w-auto drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Icon Background */}
        <path
          d="M40 10H100C116.569 10 130 23.4315 130 40V100C130 122.091 112.091 140 90 140H30C18.9543 140 10 131.046 10 120V50C10 27.9086 27.9086 10 40 10Z"
          fill="#b22931"
        />
        {/* Stylized "S" */}
        <path
          d="M105 45H45C38 45 36 47 36 53C36 59 38 61 45 61H90C97 61 99 63 99 70C99 77 97 79 90 79H32V68H90C97 68 99 66 99 60C99 54 97 52 90 52H45C38 52 36 50 36 43C36 36 38 34 45 34H105V45Z"
          fill="white"
        />

        {!iconOnly && (
          <g transform="translate(150, 70)">
            <text
              className="font-sora font-bold text-[#262625] dark:text-white"
              style={{ fontSize: '62px', letterSpacing: '-0.03em' }}
              fill="currentColor"
              x="0"
              y="0"
            >
              succes
            </text>
            <text
              className="font-sora font-bold text-[#b22931]"
              style={{ fontSize: '62px', letterSpacing: '-0.03em' }}
              fill="#b22931"
              x="0"
              y="60"
            >
              invest
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default Logo;
