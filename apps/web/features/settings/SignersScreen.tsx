import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { PenTool } from 'lucide-react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { settingsPage } from './SettingsFrame'
import { AddSignerForm, BookkeeperSwitches, SignersTable } from './SignersForms'

const t = copy.settings.signers

/**
 * /settings/signers (spec/03 §4.9): the owner and the administrator keep the
 * list; the switch for an outside bookkeeper is the owner's (02 §3).
 */
export async function SignersScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string }
}) {
  const page = await settingsPage(slug, 'signers', search, 'admin')
  if ('done' in page) return page.done
  const { shell, forced, paused, frame } = page.ctx
  const dto = await getRepositories().settings.signers(shell.tenant.id)
  const signers = forced === 'empty' ? [] : dto.signers

  return frame(
    <>
      <p className="text-sm text-text-secondary">{t.intro}</p>
      {signers.length === 0 ? (
        <EmptyState icon={PenTool} title={t.title} body={t.empty} />
      ) : (
        <SignersTable slug={slug} signers={signers} readOnly={paused} />
      )}
      {!paused && <AddSignerForm slug={slug} candidates={dto.candidates} />}
      {dto.bookkeepers.length > 0 && (
        <BookkeeperSwitches
          slug={slug}
          bookkeepers={dto.bookkeepers}
          canChange={!paused && shell.role === 'owner'}
        />
      )}
    </>,
  )
}
