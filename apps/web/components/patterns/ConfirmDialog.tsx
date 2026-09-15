'use client'

import { copy, fill } from '@wc/copy'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export interface ConfirmDialogProps {
  /** A question: "Delete this project?" (spec/15 §3). */
  title: string
  /** The consequence, not a repeat of the title. */
  body: string
  /** The action by name: "Delete project". The other button is always Cancel. */
  confirmLabel: string
  danger?: boolean
  /** When set, the user must type this before confirming. */
  requireText?: string
  onConfirm: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Modals only confirm dangerous actions (spec/03 §1). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger = false,
  requireText,
  onConfirm,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const blocked = requireText !== undefined && typed !== requireText

  const change = (next: boolean) => {
    if (!next) setTyped('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {requireText !== undefined && (
          <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-xs font-semibold text-n-700">
              {fill(copy.confirm.typeToConfirm, { 'Company name': requireText })}
            </label>
            <Input
              id={inputId}
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{copy.buttons.cancel}</Button>
          </DialogClose>
          <Button
            variant={danger ? 'destructive' : 'default'}
            disabled={blocked}
            onClick={() => {
              onConfirm()
              change(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
