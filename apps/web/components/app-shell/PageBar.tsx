import Link from 'next/link'
import type { ReactNode } from 'react'
import { MenuButton, RoleSwitcherSlot, SubscriptionSlot } from './ShellSlots'

export interface Crumb {
  label: string
  href?: string
}

export interface PageBarProps {
  title: string
  /** Quiet text after the title, e.g. "week ending Sat Sep 12" (spec/15 §3). */
  meta?: string
  breadcrumb: Crumb[]
  actions?: ReactNode
  /** Ctrl K search, from CommandPalette (later session). */
  search?: ReactNode
  /** Bell, from NotificationBell (later session). */
  notifications?: ReactNode
}

/**
 * The bar at the top of the right column (spec/14 §6): breadcrumb, title and
 * actions, search and the bell on the right. There is no separate full-width
 * top bar. The subscription banner sits right below it (spec/03 §3).
 */
export function PageBar({ title, meta, breadcrumb, actions, search, notifications }: PageBarProps) {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-border-decorative bg-white px-6 pt-3.5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <MenuButton />
          <div className="min-w-0">
            {breadcrumb.length > 0 && (
              <ol className="mb-0.5 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                {breadcrumb.map((crumb, i) => (
                  <li key={crumb.href ?? crumb.label} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="rounded-sm hover:underline focus-visible:focus-ring"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-n-700">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {title}
              {meta && (
                <span className="ml-2.5 text-sm font-normal tracking-normal text-text-secondary">
                  {meta}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {search}
          {notifications}
          <RoleSwitcherSlot />
        </div>
      </header>
      <SubscriptionSlot />
    </>
  )
}
