'use client'

import type { MembershipRole, TenantDTO } from '@wc/data/dto'
import { createContext, type RefObject, use } from 'react'
import type { SubscriptionBannerState } from '@/lib/subscription'

/** id of the narrow-screen menu panel, for the Menu button's aria-controls (spec/14 §6). */
export const APP_MENU_ID = 'app-menu'

export interface ShellContextValue {
  tenant: TenantDTO
  role: MembershipRole
  pickedRole: MembershipRole
  subscription: SubscriptionBannerState | null
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  /** Focus returns here when the panel closes (spec/14 §6). */
  menuButtonRef: RefObject<HTMLButtonElement | null>
  /** Where RoleSwitcher lands when the new demo user is not in this company. */
  demoHomeHref: string
}

export const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const value = use(ShellContext)
  if (!value) throw new Error('useShell() must be used inside <AppShell>')
  return value
}
