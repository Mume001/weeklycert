'use client'

// "Delete the company" (spec/03 §4.9): the name typed in, then 30 days of
// grace with read-only access and export (08 §2.3).
import { copy, fill } from '@wc/copy'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { requestDeletionAction } from './actions'

const t = copy.settings.data.delete

export function DeleteCompany({ slug, companyName }: { slug: string; companyName: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="grid gap-2">
      <div>
        <Button variant="destructive" disabled={pending} onClick={() => setOpen(true)}>
          {t.confirm}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error-600">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        danger
        title={fill(t.confirmTitle, { Company: companyName })}
        body={t.body}
        confirmLabel={t.confirm}
        requireText={companyName}
        onConfirm={() =>
          start(async () => {
            const result = await requestDeletionAction(slug, companyName)
            setOpen(false)
            if (!result.ok) {
              setError(t.nameMismatch)
              return
            }
            router.refresh()
          })
        }
      />
    </div>
  )
}
