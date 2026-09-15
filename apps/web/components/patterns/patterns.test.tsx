import { fireEvent, render, screen } from '@testing-library/react'
import type { DisplayStatus } from '@wc/data/dto'
import { Inbox } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'
import { DataTable } from './DataTable'
import { DateText } from './DateText'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { ForbiddenState } from './ForbiddenState'
import { Hours } from './Hours'
import { LockedBanner } from './LockedBanner'
import { Money } from './Money'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge: icon and word, never colour alone', () => {
  it.each([
    ['draft', 'Draft'],
    ['needs_attention', 'Needs attention'],
    ['validated', 'Validated'],
    ['signed', 'Signed'],
    ['submitted', 'Submitted'],
    ['rejected', 'Rejected'],
    ['corrected', 'Corrected'],
  ] as [DisplayStatus, string][])('%s', (status, word) => {
    const { container } = render(<StatusBadge status={status} />)
    expect(screen.getByText(word)).toBeTruthy()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

describe('number and date text', () => {
  it('formats through lib/format', () => {
    render(
      <p>
        <Money value="2216" /> <Hours value="8" /> <DateText value="2026-09-12" />
      </p>,
    )
    expect(screen.getByText('$2,216.00')).toBeTruthy()
    expect(screen.getByText('8.0')).toBeTruthy()
    expect(screen.getByText('Sep 12, 2026').getAttribute('datetime')).toBe('2026-09-12')
  })
})

describe('states from spec/19 §7', () => {
  it('EmptyState shows one sentence and one action', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No workers yet"
        body="Add them one by one, or import a list."
        action={<button type="button">Import workers</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Import workers' })).toBeTruthy()
  })

  it('ErrorState offers Try again and the reference', () => {
    const retry = vi.fn()
    render(<ErrorState requestId="req_42" onRetry={retry} />)
    expect(screen.getByText('This did not load.')).toBeTruthy()
    expect(screen.getByText('Reference req_42')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('ForbiddenState names the needed role and who to ask', () => {
    render(
      <ForbiddenState
        role="viewer"
        needed="owner"
        owner={{ name: 'Mirza Hodzic', email: 'owner@hudson-electric.test' }}
        dashboardHref="/app/hudson-electric/dashboard"
      />,
    )
    expect(
      screen.getByText('This page needs the Owner role. You are signed in as Viewer.'),
    ).toBeTruthy()
    const ask = screen.getByRole('link', { name: 'Ask Mirza Hodzic for access' })
    expect(ask.getAttribute('href')).toBe('mailto:owner@hudson-electric.test')
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeTruthy()
  })

  it('LockedBanner says who signed and offers a correction', () => {
    const correct = vi.fn()
    render(
      <LockedBanner
        reason="signed"
        signedAt="2026-09-01"
        signedBy="Ray Hodzic"
        onCreateCorrection={correct}
      />,
    )
    expect(
      screen.getByText('This week was signed on Sep 1, 2026 by Ray Hodzic and cannot be changed.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Create a correction' }))
    expect(correct).toHaveBeenCalledOnce()
  })

  it('LockedBanner for a submitted week, without a correction for viewers', () => {
    render(<LockedBanner reason="submitted" signedAt="2026-08-26" />)
    expect(
      screen.getByText('This week was submitted on Aug 26, 2026 and cannot be changed.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ConfirmDialog', () => {
  it('keeps the dangerous button disabled until the name is typed', () => {
    const confirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete this project?"
        body="Its weeks and reports go to the archive."
        confirmLabel="Delete project"
        danger
        requireText="Hudson Electric LLC"
        onConfirm={confirm}
      />,
    )
    const button = screen.getByRole('button', { name: 'Delete project' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Type Hudson Electric LLC to confirm.'), {
      target: { value: 'Hudson Electric LLC' },
    })
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledOnce()
  })
})

describe('DataTable', () => {
  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'gross', header: 'Gross', meta: { align: 'right' as const } },
  ]

  it('renders rows and right-aligns number columns', () => {
    render(
      <DataTable
        columns={columns}
        data={[{ name: 'Chen, David', gross: '$2,798.20' }]}
        empty={<p>empty</p>}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Gross' }).className).toContain('text-right')
    expect(screen.getByRole('cell', { name: '$2,798.20' }).className).toContain('tabular-nums')
  })

  it('shows the empty state instead of an empty table', () => {
    render(<DataTable columns={columns} data={[]} empty={<p>Nothing filed yet.</p>} />)
    expect(screen.getByText('Nothing filed yet.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows a skeleton while loading', () => {
    const { container } = render(<DataTable columns={columns} data={[]} empty={null} loading />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
