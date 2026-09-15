'use client'

import { copy } from '@wc/copy'
import type { MembershipRole, TenantBrief, UserDTO } from '@wc/data/dto'
import { cn } from 'cn'
import {
  Archive,
  CalendarDays,
  Check,
  ChevronsUpDown,
  CircleHelp,
  Download,
  Folder,
  Heart,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  SquareCheckBig,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SheetClose } from '@/components/ui/sheet'
import { initials } from '@/lib/format'
import type { NavItem, NavKey } from '@/lib/nav'
import { TenantSwitcher } from './TenantSwitcher'

// Icons 20 px in navigation, stroke 1.75 (spec/14 §10).
const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  thisWeek: CalendarDays,
  projects: Folder,
  workers: Users,
  fringePlans: Heart,
  import: Download,
  archive: Archive,
  setup: SquareCheckBig,
  settings: Settings,
  help: CircleHelp,
}

export interface SidebarProps {
  items: NavItem[]
  activeKey: NavKey | null
  /** True when rendered inside the narrow-screen panel (spec/14 §6). */
  collapsed: boolean
  tenants: TenantBrief[]
  activeTenantId: string
  user: UserDTO
  role: MembershipRole
  onNavigate?: () => void
}

/**
 * Dark sidebar (spec/14 §3 and §6): company switcher on top, navigation by
 * group, then the user and help at the bottom, in the same place on every
 * screen (WCAG 3.2.6). The panel version has the same content plus Close.
 */
export function Sidebar({
  items,
  activeKey,
  collapsed,
  tenants,
  activeTenantId,
  user,
  role,
  onNavigate,
}: SidebarProps) {
  const companyHeadingId = useId()
  const main = items.filter((i) => i.group === 'main')
  const company = items.filter((i) => i.group === 'company')
  const help = items.find((i) => i.group === 'footer')

  const link = (item: NavItem) => {
    const Icon = ICONS[item.key]
    const active = item.key === activeKey
    return (
      <li key={item.key}>
        {/* No prefetch while most targets are screens of later sessions: a
            prefetch of a route that does not exist yet is a 404 in the console
            (spec/19 §10 point 1). Turn it back on once the routes exist. */}
        <Link
          href={item.href}
          prefetch={false}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'relative mb-px flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-n-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:focus-ring',
            active &&
              'bg-white/10 font-semibold text-white before:absolute before:top-1.5 before:bottom-1.5 before:-left-2.5 before:w-[3px] before:rounded-r-sm before:bg-teal-300',
          )}
        >
          <Icon
            className={cn('size-5 shrink-0', active ? 'text-teal-300' : 'text-n-400')}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="ml-auto rounded-full bg-error-600 px-1.5 text-xs font-semibold text-white tabular-nums">
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-n-900 text-white">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3.5">
        <span className="flex items-center gap-2.5 text-md font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-linear-160 from-teal-400 to-teal-600">
            <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          </span>
          {copy.brand.name}
        </span>
        {collapsed && (
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-n-300 hover:bg-white/10 hover:text-white"
            >
              <X aria-hidden="true" />
              {copy.shell.menu.close}
            </Button>
          </SheetClose>
        )}
      </div>

      <TenantSwitcher tenants={tenants} activeId={activeTenantId} onNavigate={onNavigate} />

      <nav className="flex-1 px-2.5">
        <ul>{main.map(link)}</ul>
        {company.length > 0 && (
          <>
            <p
              id={companyHeadingId}
              className="px-2 pt-4 pb-1.5 text-xs font-semibold tracking-wider text-n-400 uppercase"
            >
              {copy.nav.companyGroup}
            </p>
            <ul aria-labelledby={companyHeadingId}>{company.map(link)}</ul>
          </>
        )}
      </nav>

      <div className="mt-4 border-t border-white/10 px-2.5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-white/5 focus-visible:focus-ring"
            >
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-semibold"
              >
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-n-400">{copy.roles[role].label}</span>
              </span>
              <ChevronsUpDown className="size-4 text-n-400" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/account" prefetch={false}>
                {copy.shell.user.account}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/security" prefetch={false}>
                {copy.shell.user.security}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/login" prefetch={false}>
                {copy.shell.user.signOut}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {help && (
          <a
            href={help.href}
            className="mt-1 flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-n-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:focus-ring"
          >
            <CircleHelp className="size-5 text-n-400" strokeWidth={1.75} aria-hidden="true" />
            {help.label}
          </a>
        )}
      </div>
    </div>
  )
}
