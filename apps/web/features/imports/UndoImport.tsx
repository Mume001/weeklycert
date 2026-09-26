'use client'

import { copy } from '@wc/copy'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { Notice } from '@/components/patterns/Notice'
import { Button } from '@/components/ui/button'
import { undoAction } from './actions'

const d = copy.imports.detail

/** "Undo this import" (spec/06 §2 step 4), confirmed first, since it takes hours out of a week. */
export function UndoImport({ slug, batchId }: { slug: string; batchId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [refused, setRefused] = useState<'locked' | 'expired' | null>(null)
  return (
    <div className="grid justify-items-start gap-2">
      {refused && <Notice tone="warning" title={d[refused]} />}
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {d.undo}
      </Button>
      <ConfirmDialog
        title={d.confirmTitle}
        body={d.confirmBody}
        confirmLabel={d.confirm}
        danger
        open={open}
        onOpenChange={setOpen}
        onConfirm={async () => {
          const result = await undoAction(slug, batchId)
          setOpen(false)
          if (!result.ok) setRefused(result.refused)
          else router.refresh()
        }}
      />
    </div>
  )
}
