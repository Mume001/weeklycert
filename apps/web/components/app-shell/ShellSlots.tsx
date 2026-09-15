'use client'

// The parts of PageBar that need the shell's state. PageBar itself stays a
// server component; these read the context AppShell provides.
import { copy } from '@wc/copy'
import { MenuIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setMockRole } from '@/lib/mock-role'
import { canManageBilling } from '@/lib/subscription'
import { RoleSwitcher } from './RoleSwitcher'
import { APP_MENU_ID, useShell } from './ShellContext'
import { SubscriptionBanner } from './SubscriptionBanner'

/** Narrower than 1024 px: opens the sidebar panel (spec/14 §6). */
export function MenuButton() {
  const { menuOpen, setMenuOpen } = useShell()
  return (
    <Button
      variant="secondary"
      size="sm"
      className="lg:hidden"
      aria-expanded={menuOpen}
      aria-controls={APP_MENU_ID}
      onClick={() => setMenuOpen(true)}
    >
      <MenuIcon aria-hidden="true" />
      {copy.shell.menu.open}
    </Button>
  )
}

/** Mock phase only (spec/19 §4). */
export function RoleSwitcherSlot() {
  const { pickedRole, tenant, demoHomeHref } = useShell()
  const router = useRouter()
  return (
    <RoleSwitcher
      role={pickedRole}
      onChange={(role) => {
        setMockRole(role)
        // Every demo role belongs to the demo company; elsewhere the new user may not.
        if (demoHomeHref.startsWith(`/app/${tenant.slug}/`)) router.refresh()
        else router.push(demoHomeHref)
      }}
    />
  )
}

export function SubscriptionSlot() {
  const { subscription, role, tenant } = useShell()
  const router = useRouter()
  if (!subscription) return null
  return (
    <SubscriptionBanner
      {...subscription}
      onAction={
        canManageBilling(role)
          ? () => router.push(`/app/${tenant.slug}/settings/billing`)
          : undefined
      }
    />
  )
}
