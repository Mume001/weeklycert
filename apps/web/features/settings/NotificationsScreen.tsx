import { copy } from '@wc/copy'
import { getRepositories } from '@wc/data'
import { flag } from '@/lib/flags'
import { smsConsentText } from '@/lib/legal'
import { NOTIFICATION_WRITERS } from '@/lib/session'
import { ChannelsForm, NotificationsForm } from './NotificationsForms'
import { settingsPage } from './SettingsFrame'

/**
 * /settings/notifications (spec/03 §4.9): the owner and the administrator
 * change it; payroll, signer and bookkeeper read their own row (02 §3).
 */
export async function NotificationsScreen({
  slug,
  search,
}: {
  slug: string
  search: { state?: string }
}) {
  const page = await settingsPage(slug, 'notifications', search, 'admin')
  if ('done' in page) return page.done
  const { shell, forced, paused, frame } = page.ctx
  const writer = NOTIFICATION_WRITERS.includes(shell.role)
  const dto = await getRepositories().settings.notifications(shell.tenant.id)
  const smsEnabled = await flag('sms_reminders', shell.tenant.id)
  const readOnly = paused || !writer

  return frame(
    <>
      {!writer && (
        <p className="text-sm text-text-secondary">{copy.settings.notifications.readOnly}</p>
      )}
      <NotificationsForm
        slug={slug}
        dto={forced === 'empty' ? { ...dto, deadlineReminderDays: [] } : dto}
        readOnly={readOnly}
        onlyUserId={writer ? null : shell.user.id}
      />
      <ChannelsForm
        slug={slug}
        sms={forced === 'empty' ? null : dto.sms}
        readOnly={readOnly}
        smsEnabled={smsEnabled}
        // Off, not even the words go to the browser.
        consentText={smsEnabled ? smsConsentText() : ''}
      />
    </>,
  )
}
