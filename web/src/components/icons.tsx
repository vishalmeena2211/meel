// One stroke set, drawn on a 24 by 24 grid. Geometry follows the Lucide icon set (ISC licence).
import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: ReactNode) {
  return function Icon({ className, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className ?? "size-4"}
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const IconBack = icon(<path d="m15 18-6-6 6-6" />);
export const IconRight = icon(<path d="m9 18 6-6-6-6" />);
export const IconDown = icon(<path d="m6 9 6 6 6-6" />);
export const IconCheck = icon(<path d="M20 6 9 17l-5-5" />);
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);
export const IconExternal = icon(
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />,
);
export const IconFuel = icon(
  <path d="M3 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17M2 22h13M6 8h5M14 11h2a2 2 0 0 1 2 2v3a2 2 0 0 0 4 0V8l-3-3" />,
);
export const IconWrench = icon(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
);
export const IconSignal = icon(<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16" />);
export const IconPeak = icon(<path d="m8 3 4 8 5-5 5 15H2z" />);
export const IconBed = icon(<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />);
export const IconList = icon(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />);
export const IconMap = icon(<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15" />);
export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
);
export const IconShield = icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);
export const IconSend = icon(<path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />);
export const IconBag = icon(<path d="M6 7V6a6 6 0 0 1 12 0v1M4 7h16l-1 14H5z" />);
export const IconCard = icon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </>,
);
export const IconLock = icon(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);
export const IconFlag = icon(<path d="M4 22V4M4 4h13l-2 4 2 4H4" />);
export const IconShare = icon(
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </>,
);
export const IconAlert = icon(
  <>
    <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);
export const IconUser = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);
export const IconPlay = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className ?? "size-4"} fill="currentColor">
    <path d="M7 4v16l13-8z" />
  </svg>
);
