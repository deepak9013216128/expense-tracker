'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, BarChart2, Settings } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/history', label: 'History', icon: List },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
      <div className="max-w-[430px] mx-auto flex pb-4 pt-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 transition-all duration-150 active:scale-95 ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative flex flex-col items-center">
                {active && (
                  <span className="absolute -top-1 w-1 h-1 rounded-full bg-indigo-600 -translate-y-full" />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'text-indigo-600' : 'text-slate-400'}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  active ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
