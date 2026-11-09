import { useId } from 'react'

/**
 * Home's glossy blue wave, from the "Blue Shiny Wave" prototype (assets/blue-wave.svg), drawn inline so no image file
 * or CSP change is needed. Purely decorative and behind the content (see .wave-art); softer in the light theme.
 */
export function WaveArt() {
  // Ids must be unique on the page; React's useId keeps them stable between renders.
  const id = useId().replace(/:/g, '')
  const ref = (name: string) => `url(#${id}-${name})`
  return (
    <svg
      className="wave-art"
      viewBox="0 0 1440 390"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="#072550" />
          <stop offset=".23" stopColor="#1456a5" />
          <stop offset=".40" stopColor="#56b9ff" />
          <stop offset=".47" stopColor="#08387c" />
          <stop offset=".69" stopColor="#0b5de3" />
          <stop offset="1" stopColor="#041b44" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#a4e7ff" stopOpacity=".72" />
          <stop offset=".31" stopColor="#56bbff" stopOpacity=".37" />
          <stop offset="1" stopColor="#0a43be" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#3c99ff" stopOpacity=".38" />
          <stop offset="1" stopColor="#125be6" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="23" />
        </filter>
        <filter id={`${id}-small`}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse cx="1040" cy="147" rx="430" ry="118" fill={ref('glow')} filter={ref('soft')} />
      <path
        d="M445 244C654 249 775 20 998 78c155 41 239 163 448 73v112c-183 76-321-52-491-84C779 145 700 347 445 308Z"
        fill={ref('ribbon')}
        opacity=".64"
      />
      <path
        d="M510 252C739 273 781 77 1001 115c157 27 253 129 435 48"
        stroke={ref('shine')}
        strokeWidth="17"
        fill="none"
        opacity=".75"
        filter={ref('small')}
      />
      <path
        d="M510 246C738 271 781 77 1000 115c156 27 254 129 435 47"
        stroke="#82d7ff"
        strokeWidth="2.7"
        fill="none"
        opacity=".66"
      />
      <path
        d="M550 284C744 307 803 133 994 148c152 11 277 120 443 60"
        stroke="#177ff3"
        strokeWidth="36"
        fill="none"
        opacity=".3"
        filter={ref('small')}
      />
      <path
        d="M607 280C768 279 817 166 992 178c149 11 262 100 443 59"
        stroke="#78baff"
        strokeWidth="2"
        fill="none"
        opacity=".28"
      />
      <path
        d="M660 337C835 260 921 253 1100 284c112 19 219 8 349-55"
        stroke="#1661c4"
        strokeWidth="29"
        fill="none"
        opacity=".29"
        filter={ref('small')}
      />
      <path
        d="M587 229C810 196 837 43 1027 75c121 22 244 114 405 44"
        stroke="#268efa"
        strokeWidth="4"
        fill="none"
        opacity=".27"
      />
    </svg>
  )
}
