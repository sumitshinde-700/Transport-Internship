// SM logo mark: blocky S and M on a highway-sign green tile, with a dashed lane line.
export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="SM logo" style={{ flexShrink: 0 }}>
      <rect width="64" height="64" rx="8" fill="#0f5c46" />
      <g fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="miter">
        <path d="M28 18H14V31H28V44H14" />
        <path d="M36 44V18L45 30L54 18V44" />
      </g>
      <path d="M10 55H54" stroke="#f4b400" strokeWidth="3" strokeDasharray="6 4" />
    </svg>
  );
}
