export default function Logo({ size = 22 }) {
  return (
    <div className="ws-logo">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="11" cy="16" r="9" stroke="#06b6d4" strokeWidth="2" opacity=".45" />
        <circle cx="21" cy="16" r="9" stroke="#f59e0b" strokeWidth="2" opacity=".45" />
        <ellipse cx="16" cy="16" rx="4.5" ry="9" fill="url(#wslg)" opacity=".75" />
        <defs>
          <linearGradient id="wslg" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M13.5 12.5l6 3.5-6 3.5V12.5z" fill="white" />
      </svg>
      <span className="ws-logo-text" style={{ fontSize: size * 0.9 }}>
        Watch<span className="ws-logo-accent">Sync</span>
      </span>
    </div>
  );
}
