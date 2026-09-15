'use client'

import { copy } from '@wc/copy'
import type { MembershipRole, TenantBrief, TenantDTO, UserDTO } from '@wc/data/dto'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { activeNavKey, type NavItem } from '@/lib/nav'
import type { SubscriptionBannerState } from '@/lib/subscription'
import { APP_MENU_ID, ShellContext } from './ShellContext'
import { Sidebar } from './Sidebar'

export interface AppShellProps {
  children: ReactNode
  tenant: TenantDTO
  /** Every company the user belongs to, for the switcher. */
  tenants: TenantBrief[]
  user: UserDTO
  /** The user's role in this company. */
  role: MembershipRole
  /** Mock phase: the role picked in RoleSwitcher. */
  pickedRole: MembershipRole
  nav: NavItem[]
  subscription: SubscriptionBannerState | null
  demoHomeHref: string
}

/**
 * spec/14 §6: a 240 px sidebar on the left, the page bar and content on the
 * right, no full-width top bar. Narrower than 1024 px the sidebar becomes a
 * modal panel opened by the Menu button in the page bar.
 */
export function AppShell({
  children,
  tenant,
  tenants,
  user,
  role,
  pickedRole,
  nav,
  subscription,
  demoHomeHref,
}: AppShellProps) {
  const pathname = usePathname()
  const search = useSearchParams()
  const activeKey = activeNavKey(pathname, search.toString())
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const context = useMemo(
    () => ({ tenant, role, pickedRole, subscription, menuOpen, setMenuOpen, demoHomeHref }),
    [tenant, role, pickedRole, subscription, menuOpen, demoHomeHref],
  )

  const sidebar = (collapsed: boolean) => (
    <Sidebar
      items={nav}
      activeKey={activeKey}
      collapsed={collapsed}
      tenants={tenants}
      activeTenantId={tenant.id}
      user={user}
      role={role}
      onNavigate={closeMenu}
    />
  )

  return (
    <ShellContext value={context}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="sticky top-0 hidden h-dvh lg:block">{sidebar(false)}</div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            id={APP_MENU_ID}
            side="left"
            showCloseButton={false}
            aria-describedby={undefined}
            className="w-60 max-w-[85vw] border-0 bg-n-900 lg:hidden"
          >
            <SheetTitle className="sr-only">{copy.shell.menu.open}</SheetTitle>
            {sidebar(true)}
          </SheetContent>
        </Sheet>
        <main className="flex min-w-0 flex-col">{children}</main>
      </div>
    </ShellContext>
  )
}
