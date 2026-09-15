'use client'

import { copy } from '@wc/copy'
import type { MembershipRole } from '@wc/data/dto'
import { ChevronDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLES = Object.keys(copy.roles) as MembershipRole[]
const isRole = (value: string): value is MembershipRole =>
  (ROLES as readonly string[]).includes(value)

export interface RoleSwitcherProps {
  role: MembershipRole
  onChange: (role: MembershipRole) => void
}

/**
 * Mock phase only (spec/19 §4): acts as the demo user of another role without
 * signing in again, so role-based navigation and ForbiddenState can be checked.
 */
export function RoleSwitcher({ role, onChange }: RoleSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Eye aria-hidden="true" />
          {`${copy.shell.roleSwitcher.viewingAs} ${copy.roles[role].label}`}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          {copy.shell.roleSwitcher.note}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(value) => {
            if (isRole(value) && value !== role) onChange(value)
          }}
        >
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {copy.roles[r].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
