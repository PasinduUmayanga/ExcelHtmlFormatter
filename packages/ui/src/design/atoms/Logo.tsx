/**
 * The FormaFlow mark, "Page in flow" (docs/design/brand.md): a page whose plain line turns into a teal arrow.
 * Decorative: the product name is always written next to it, so screen readers skip the drawing.
 * Keep the shapes in line with apps/excel-formatter/build/icon.svg.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="logo"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="15" fill="#1F6FEB" />
      <path
        d="M17.5 11H36l11 11v28.5a3.5 3.5 0 0 1-3.5 3.5h-26a3.5 3.5 0 0 1-3.5-3.5v-36a3.5 3.5 0 0 1 3.5-3.5z"
        fill="#FFFFFF"
      />
      <path d="M36 11v8.5a2.5 2.5 0 0 0 2.5 2.5H47z" fill="#BFD4FB" />
      <rect x="20" y="27" width="13" height="4.5" rx="2.25" fill="#0B2E6B" />
      <rect x="20" y="35" width="20" height="3" rx="1.5" fill="#9FB9E6" />
      <path d="M20 46h6.5c4.5 0 6-5 10.5-5h4.5" fill="none" stroke="#0B8277" strokeWidth="3.6" strokeLinecap="round" />
      <path
        d="M39 37.2l4 3.8-4 3.8"
        fill="none"
        stroke="#0B8277"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
