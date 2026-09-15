import { DEMO_TENANT_SLUG } from '@wc/data'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell/AppShell'
import { buildNav } from '@/lib/nav'
import { loadShell } from '@/lib/session'
import { subscriptionBanner } from '@/lib/subscription'

// AppShell for every company route (spec/19 §2). A company the user is not a
// member of answers 404, never 403 (spec/11 §6).
export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ t: string }>
}) {
  const { t } = await params
  const shell = await loadShell(t)
  if (!shell) notFound()

  return (
    <AppShell
      tenant={shell.tenant}
      tenants={shell.tenants}
      user={shell.user}
      role={shell.role}
      pickedRole={shell.pickedRole}
      nav={buildNav({ role: shell.role, slug: t, openWeeks: shell.openWeeks })}
      subscription={subscriptionBanner(shell.tenant, shell.today)}
      demoHomeHref={`/app/${DEMO_TENANT_SLUG}/dashboard`}
    >
      {children}
    </AppShell>
  )
}
