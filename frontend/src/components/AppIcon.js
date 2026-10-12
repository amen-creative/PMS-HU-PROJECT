import React from "react";

const icons = {
  dashboard: (
    <>
      <path d="M4 13.5h7.5V4H4z" />
      <path d="M12.5 20H20v-9.5h-7.5z" />
      <path d="M12.5 9.5H20V4h-7.5z" />
      <path d="M4 20h7.5v-4.5H4z" />
    </>
  ),
  assets: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 3v9l8 4.5" />
      <path d="M12 12L4 16.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  assignments: (
    <>
      <path d="M8 7h10" />
      <path d="M8 12h10" />
      <path d="M8 17h7" />
      <path d="M5 7h.01" />
      <path d="M5 12h.01" />
      <path d="M5 17h.01" />
    </>
  ),
  transfers: (
    <>
      <path d="M7 7h11" />
      <path d="M14 4l4 3-4 3" />
      <path d="M17 17H6" />
      <path d="M10 14l-4 3 4 3" />
    </>
  ),
  incidents: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  reports: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h4" />
    </>
  ),
  notifications: (
    <>
      <path d="M15 17H9a3 3 0 0 0 6 0z" />
      <path d="M18 17V11a6 6 0 1 0-12 0v6L4 19h16z" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M5.64 5.64l1.41 1.41" />
      <path d="M16.95 16.95l1.41 1.41" />
      <path d="M18.36 5.64l-1.41 1.41" />
      <path d="M7.05 16.95l-1.41 1.41" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  user: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  activity: <path d="M4 12h4l2.5-6 3 12 2.5-6H20" />,
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.6-3.1 7.8-7 9-3.9-1.2-7-4.4-7-9V6z" />
      <path d="M9.5 12.5l1.8 1.8 3.7-4.1" />
    </>
  ),
  qr: (
    <>
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h2" />
      <path d="M18 14h2v2" />
      <path d="M14 18h2v2" />
      <path d="M18 18h2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
      <path d="M14 5h5v14h-5" />
    </>
  ),
  sparkle: <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />,
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  )
};

function AppIcon({ name, size = 18, strokeWidth = 1.8, className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.dashboard}
    </svg>
  );
}

export default AppIcon;
