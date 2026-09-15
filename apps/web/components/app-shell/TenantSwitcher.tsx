'use client'

import { copy, fill } from '@wc/copy'
import type { TenantBrief } from '@wc/data/dto'
import { Check, ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface TenantSwitcherProps {
  tenants: TenantBrief[]
  activeId: string
  onNavigate?: () => void
}

const subtitle = (t: TenantBrief) =>
  fill(copy.shell.tenantSwitcher.subtitle, { Role: copy.roles[t.role].label, n: t.activeProjects })

/**
 * Company switcher at the top of the sidebar (spec/14 §6, text spec/15 §3).
 * With one company the name stays, but there is nothing to pick, so it is not
 * a control. Switching goes to the other company's dashboard (spec/03 §4.2).
 */
export function TenantSwitcher({ tenants, activeId, onNavigate }: TenantSwitcherProps) {
  const active = tenants.find((t) => t.id === activeId)
  if (!active) return null

  const label = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-white">{active.name}</span>
      <span className="block truncate text-xs text-n-400">{subtitle(active)}</span>
    </span>
  )

  if (tenants.length < 2) {
    return (
      <div className="mx-3 mb-3 flex rounded-md border border-white/10 bg-white/5 px-3 py-2">
        {label}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10 focus-visible:focus-ring"
        >
          {label}
          <ChevronsUpDown className="size-4 shrink-0 text-n-400" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
      >
        <DropdownMenuLabel>{copy.shell.tenantSwitcher.title}</DropdownMenuLabel>
        {tenants.map((t) => (
          <DropdownMenuItem key={t.id} asChild>
            <Link
              href={`/app/${t.slug}/dashboard`}
              prefetch={false}
              onClick={onNavigate}
              aria-current={t.id === activeId ? 'true' : undefined}
              className="items-start"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{t.name}</span>
                <span className="block truncate text-xs text-text-secondary">{subtitle(t)}</span>
              </span>
              {t.id === activeId && <Check className="mt-0.5 text-brand" aria-hidden="true" />}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* /firms is a later screen: no prefetch until it exists (see Sidebar). */}
          <Link href="/firms" prefetch={false} onClick={onNavigate}>
            {copy.shell.tenantSwitcher.seeAll}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
