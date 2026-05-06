import { SVGProps, ReactElement } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const icons: Record<string, (p: IconProps) => ReactElement> = {
  food: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 14h16" />
      <path d="M4 14c0 3.3 3.58 6 8 6s8-2.7 8-6" />
      <path d="M8.5 14V9.5a3.5 3.5 0 017 0V14" />
      <path d="M9.5 6c0-1 .5-2 .5-2M12 5c0-1 .5-2 .5-2" />
    </svg>
  ),
  groceries: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2L3 6v13a2 2 0 002 2h14a2 2 0 002-2V6L18 2H6z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  ),
  shopping: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2h12l2 6H4L6 2z" />
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M9 12a3 3 0 006 0" />
    </svg>
  ),
  travel: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
  taxi: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H10L8 7H4a1 1 0 00-1 1v8a1 1 0 001 1h1v2a1 1 0 002 0v-2h10v2a1 1 0 002 0v-2h1a1 1 0 001-1V8a1 1 0 00-1-1h-4L14 2z" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="7.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  bills: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 4v16l2-2 2 2 2-2 2 2 2-2 2 2 2-2V4l-2 2-2-2-2 2-2-2-2 2-2-2z" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="14" y2="14" />
    </svg>
  ),
  financial: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="5,10 12,3 19,10" />
      <line x1="6" y1="10" x2="6" y2="22" />
      <line x1="10" y1="10" x2="10" y2="22" />
      <line x1="14" y1="10" x2="14" y2="22" />
      <line x1="18" y1="10" x2="18" y2="22" />
    </svg>
  ),
  transfer: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 8h14M5 8l4-4M5 8l4 4" />
      <path d="M19 16H5M19 16l-4-4M19 16l-4 4" />
    </svg>
  ),
  received: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 9h5.5a2.5 2.5 0 010 5H8" />
      <path d="M8 9h3" />
      <path d="M8 12h5" />
      <path d="M10 14l2 3" />
    </svg>
  ),
  investment: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </svg>
  ),
  medical: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  rent: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" />
    </svg>
  ),
  miscellaneous: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
}

const fallback: (p: IconProps) => ReactElement = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
)

interface CategoryIconProps extends IconProps {
  id: string
}

export default function CategoryIcon({ id, size = 20, ...rest }: CategoryIconProps) {
  const Icon = icons[id] ?? fallback
  return <Icon width={size} height={size} {...rest} />
}
