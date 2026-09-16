// Every string a user sees, keyed. The content is spec/15, copied verbatim.
// A string that is not in spec/15 does not go here: add it to 15 first.
// test/copy.test.ts fails if any value below is not found word for word in 15.
//
// Placeholders keep the spelling from 15 ({n}, {Role}, {Owner name}...).
// Fill them with fill(). English only in the MVP (spec/19 §11); the keyed
// structure is what lets Spanish be added later.
//
// Two rules from 15 §1 shape the keys:
//   11. a string with a number has two forms, `..._one` and `..._other`.
//       Pick one with plural(); never write "1 active projects".
//   12. no concrete value is written into a string. Not the week day (the firm
//       picks it), not a time, a date or a name. Those are placeholders.

export const copy = {
  brand: {
    name: 'WeeklyCert',
  },

  // 15 §3 Navigacija
  nav: {
    dashboard: 'Dashboard',
    thisWeek: 'This week',
    projects: 'Projects',
    workers: 'Workers',
    fringePlans: 'Fringe plans',
    import: 'Import',
    archive: 'Archive',
    setup: 'Setup',
    settings: 'Settings',
    help: 'Help and support',
    companyGroup: 'Company',
  },

  // 15 §3 Okvir aplikacije
  shell: {
    tenantSwitcher: {
      title: 'Your companies',
      subtitle_one: '{Role} · {n} active project',
      subtitle_other: '{Role} · {n} active projects',
      seeAll: 'See all companies',
    },
    menu: {
      open: 'Menu',
      close: 'Close',
    },
    user: {
      account: 'Account',
      security: 'Security',
      signOut: 'Sign out',
    },
    pageBar: {
      searchPlaceholder: 'Search projects, workers, weeks',
      searchShortcut: 'Ctrl K',
      searchEmpty:
        "Nothing matches that. Try a project name, a PRC number, or a worker's last name.",
      notificationsEmpty: 'Nothing needs you right now.',
      notificationsTitle: 'Notifications',
      markAllRead: 'Mark all as read',
    },
    subscription: {
      trial: {
        text_one: 'Trial, {n} day left.',
        text_other: 'Trial, {n} days left.',
        action: 'Add a payment method',
      },
      paused: {
        text: 'Subscription paused. You can read everything, but new reports cannot be generated.',
        action: 'Resume subscription',
      },
      pastDue: {
        text_one: 'The last payment did not go through. Reports keep working for {n} more day.',
        text_other: 'The last payment did not go through. Reports keep working for {n} more days.',
        action: 'Update card',
      },
    },
    roleSwitcher: {
      viewingAs: 'Viewing as',
      note: 'Demo only. This picker disappears once sign-in is real.',
    },
  },

  // 15 §3 Značka statusa. Keys are DisplayStatus (spec/19 §3).
  status: {
    draft: 'Draft',
    needs_attention: 'Needs attention',
    validated: 'Validated',
    signed: 'Signed',
    submitted: 'Submitted',
    rejected: 'Rejected',
    corrected: 'Corrected',
  },

  // 15 §3 Uloge. Keys are membership_role (spec/02 §2).
  roles: {
    owner: {
      label: 'Owner',
      description: 'Everything, including billing and deleting the company.',
    },
    admin: {
      label: 'Administrator',
      description: 'Everything except billing and deleting the company.',
    },
    payroll: { label: 'Payroll', description: 'Enters hours and prepares reports. Cannot sign.' },
    signer: {
      label: 'Signer',
      description: 'Everything Payroll can do, plus signing the certification.',
    },
    viewer: {
      label: 'Viewer',
      description: 'Reads projects, reports and the archive. No addresses, no deductions.',
    },
    bookkeeper: {
      label: 'Bookkeeper',
      description: 'An outside person who works for more than one company.',
    },
  },

  forbidden: {
    title: 'You do not have access to this page.',
    body: 'This page needs the {Needed} role. You are signed in as {Current}.',
    askOwner: 'Ask {Owner name} for access',
    backToDashboard: 'Back to dashboard',
  },

  locked: {
    signed: 'This week was signed on {date} by {Name} and cannot be changed.',
    submitted: 'This week was submitted on {date} and cannot be changed.',
    createCorrection: 'Create a correction',
  },

  buttons: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    continue: 'Continue',
    done: 'Done',
    tryAgain: 'Try again',
    download: 'Download',
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
  },

  confirm: {
    deleteProjectTitle: 'Delete this project?',
    deleteProject: 'Delete project',
    typeToConfirm: 'Type {Company name} to confirm.',
  },

  // 15 §3 Lista projekata filtrirana na otvorene sedmice (?open=1)
  projectsOpen: {
    title: 'Weeks waiting for hours',
    subtitle: 'Oldest first. New York counts the deadline from the oldest week you have not filed.',
    oldestOpenWeek: 'Oldest open week',
    empty: 'Every week is filed. Nothing is waiting.',
  },

  // 15 §3 Prijava i registracija
  auth: {
    signInTitle: 'Sign in to WeeklyCert',
    signIn: 'Sign in',
    emailLink: 'Email me a sign-in link',
    passkey: 'Use a passkey',
    failed: 'That email and password do not match. Check both, or use a sign-in link instead.',
    tooManyAttempts: 'Too many attempts. Try again at {time}, or reset your password.',
    magicLink: 'Click the button below to sign in. The link works once and expires in 15 minutes.',
    invite:
      '{Inviter} invited you to {Company} as {Role}. Accepting adds this company to your account.',
    twoFactorRequired:
      'Your role can sign certifications, so two-factor authentication is required. It takes two minutes to set up.',
  },

  // 15 §3 Kontrolna tabla
  dashboard: {
    title: '{Weekday}, {Month} {D}',
    subtitle: 'week ending {WeekEndDay} {Month} {D}',
    cards: {
      pastDeadline: 'project past the 30-day deadline',
      waitingForHours: 'weeks waiting for hours',
      waitingForSignature: 'report waiting for signature',
      acceptedThisYear: 'filings accepted this year',
    },
    deadlines: {
      title: 'State filing deadlines',
      subtitle: 'NYSDOL requires a submission at least every 30 days per project',
      daysLeft_one: '{n} day left',
      daysLeft_other: '{n} days left',
      daysLate_one: '{n} day late',
      daysLate_other: '{n} days late',
      dueToday: 'due today',
    },
    empty: 'No projects yet. A project is one public job with its own PRC number.',
    emptyAction: 'Add your first project',
  },

  // 15 §3 Mreža sati
  grid: {
    title: 'Hours',
    meta: '{WeekEndDay} {date} · payroll no. will be #{n} on signature',
    copyLastWeek: 'Copy last week',
    importCsv: 'Import CSV',
    markNoWork: 'Mark no-work week',
    reviewAndGenerate: 'Review and generate',
    generateDisabled_one: '{n} error must be fixed before you can generate the report.',
    generateDisabled_other: '{n} errors must be fixed before you can generate the report.',
    saved: 'Saved {HH:MM}',
    saving: 'Saving...',
    notSaved: 'Not saved. Check your connection.',
    emptyWeek:
      'No hours yet for this week. Copy last week to bring the same crew over, or import a file.',
    locked:
      'This week was signed on {date} and cannot be changed. Create a correction to file a new version.',
    conflict_one: '{Name} changed this week {n} minute ago. Your view has been refreshed.',
    conflict_other: '{Name} changed this week {n} minutes ago. Your view has been refreshed.',
    // Three counters, each counting its own thing (15 §3). A comma joins them in
    // the badge; that is layout, not a sentence.
    errors_one: '{n} error',
    errors_other: '{n} errors',
    warnings_one: '{n} warning',
    warnings_other: '{n} warnings',
    notes_one: '{n} note',
    notes_other: '{n} notes',
    panelNote: 'Errors block generating the report.',
    invalidCell: 'Enter hours, for example 8, 8.5 or 8/1.',
    allClear: 'Everything checks out. You can generate the report.',
  },

  // 15 §3 Pregled i potpis
  review: {
    title: 'Review and certify',
    success_one: 'No errors. {n} warning was confirmed by you on {date}.',
    success_other: 'No errors. {n} warnings were confirmed by you on {date}.',
    xmlCard: 'NY XML for the portal',
    schemaValid: 'schema valid',
    manualTitle: 'What you type into the portal by hand',
    manualSubtitle: 'the file does not carry these',
    noApi:
      'The portal has no API. You upload the file yourself and we record the confirmation. A week can only be uploaded once, into an empty week.',
    sign: 'Sign and lock this week',
    reauthTitle: 'Re-enter your password or two-factor code',
    reauthNote: 'Required even though you are signed in.',
    signatureWarning:
      'Signature is recorded electronically. Scanned signatures are not accepted by the Department of Labor.',
    signed: 'Signed by {Name} on {date} at {time} ET. This week is locked.',
  },

  // 15 §3 Predaja
  submit: {
    title: 'Submit',
    steps: [
      'Open mpwr-public.labor.ny.gov and sign in.',
      'Pick project PRC {prc}, then week ending {date}. The week must be empty; if you already started it by hand, delete those entries first.',
      'Choose Upload XML and pick the file below.',
      'Copy the confirmation number back here.',
    ],
    rejectedTitle: 'Portal rejected the file?',
    rejectedBody:
      'Paste the error exactly as the portal shows it. It reports a line and character position; we translate that into the worker and the field.',
    noWorkTitle: 'A week with no work cannot be filed as a file.',
    noWorkBody:
      'The portal has no XML for it. Tick No Work Week in the portal, or use Enter Work Pause Dates for a range.',
  },

  // 15 §3 Radnici
  workers: {
    noFullSsn:
      'We never store a full Social Security number. The portal accepts the last four digits or a date of birth.',
    encrypted: 'Home address, phone (encrypted, every read is logged)',
    addressLimits:
      'Address line 1 is limited to 42 characters and city to 40, because the NY portal rejects anything longer.',
  },

  // 15 §3 Uvoz
  imports: {
    steps: ['File', 'Mapping', 'Check', 'Reconcile and apply'],
    rowsInFile_one: '{n} row in the file',
    rowsInFile_other: '{n} rows in the file',
    /** No noun to inflect, so 15 §3 keeps one form. */
    ready: '{n} ready',
    warnings_one: '{n} warning',
    warnings_other: '{n} warnings',
    errors_one: '{n} error, this blocks',
    errors_other: '{n} errors, these block',
    fullSsn:
      'This file has a column that looks like full Social Security numbers. We do not store those. We can keep the last four digits and delete the original file after import, or you can remove the column and upload again.',
    applied: 'Imported {n} rows for {n} workers, week ending {date}. {n} rows were skipped.',
  },

  // 15 §3 Naplata
  billing: {
    trial_one:
      '{n} day left in your trial. Your card is on file and will be charged $79 on {date}.',
    trial_other:
      '{n} days left in your trial. Your card is on file and will be charged $79 on {date}.',
    failed:
      'We could not charge your card on {date}. Nothing is blocked yet. Update the card in the next 14 days to keep filing.',
    paused:
      'Paused. You can read and export everything. Entering hours and generating reports resume when you unpause.',
    cancelled:
      'Cancelled. You have read-only access and full export until {date}, 30 days from now. New York requires you to keep these records for six years, so export before then.',
  },

  // 15 §3 Prazna stanja
  emptyStates: {
    projects: 'No projects yet. A project is one public job with its own PRC number.',
    projectsAction: 'Add your first project',
    workers: 'No workers yet. Add them one by one, or import a list.',
    workersAction: 'Import workers',
    workersTitle: 'No workers yet',
    addWorker: 'Add a worker',
    archive: 'Nothing filed yet. Signed reports show up here and stay for six years.',
    imports:
      'No imports yet. Bring hours in from QuickBooks Time, Gusto, ADP, Paychex, or your own spreadsheet.',
    importsAction: 'Start an import',
    findings: 'Everything checks out. You can generate the report.',
  },

  // 15 §3 Sistemske greške
  errors: {
    forbidden:
      'You do not have access to this. Ask {Owner name} to change your role if you need it.',
    notFound:
      'That page does not exist, or it belongs to a different company. Check the company switcher at the top left.',
    server:
      'Something on our side failed. We have been told automatically. Your hours are saved. Try again in a minute, and if it keeps failing, email support@weeklycert.com.',
    maintenance:
      'WeeklyCert is being updated. This takes about ten minutes. Your data is untouched.',
    state: {
      title: 'This did not load.',
      body: 'Your data is safe. Try again, and tell us the reference below if it keeps happening.',
      retry: 'Try again',
      reference: 'Reference {requestId}',
    },
  },

  // 15 §4.2 subjects. Bodies are written in step 6b.
  email: {
    account: {
      verify: 'Verify your email',
      reset: 'Reset your password',
      passwordChanged: 'Your password was changed',
      twoFactorChanged: 'Two-factor was turned on/off',
      newDevice: 'New sign-in from a new device',
      invited: '{Name} invited you to {Company}',
      roleChanged: 'Your role changed to {Role}',
    },
    setup: {
      welcome: 'Welcome: here is what happens in the next seven days',
      waitingOnSpreadsheet: 'We are waiting on your spreadsheet',
      kickoff: 'Your kickoff call is {date}',
      ready: 'Your setup is ready. Please review and approve.',
      firstFiling: 'Your first filing is done',
    },
    weekly: {
      open: 'Week ending {date} is open',
      missingHours_one: '{n} worker is missing hours for {date}',
      missingHours_other: '{n} workers are missing hours for {date}',
      errorsBlock_one: '{n} error blocks your filing for {date}',
      errorsBlock_other: '{n} errors block your filing for {date}',
      readyToCertify: '{project} is ready to certify',
      signatureWaiting: '{Name}, a certification is waiting for your signature',
      filed: 'Filed: {project}, week ending {date}',
      rejected: 'The portal rejected {project}, week ending {date}',
      stateDeadline_one: '{project}: {n} day to your NYSDOL filing deadline',
      stateDeadline_other: '{project}: {n} days to your NYSDOL filing deadline',
      pastDeadline_one: '{project} is past the deadline. Penalties start in {n} day.',
      pastDeadline_other: '{project} is past the deadline. Penalties start in {n} days.',
      wh347Due: 'WH-347 for {project} is due in 2 days',
      noWork: 'No work on {project} last week?',
      weekAhead: 'Your week ahead',
      newSchedule: 'New wage schedule for PRC {prc}',
    },
    billing: {
      setupReceipt: 'Receipt for your setup fee',
      trialEnds: 'Your trial ends in 3 days',
      receipt: 'Receipt: $79',
      chargeFailed: 'We could not charge your card',
      cardExpires: 'Your card expires next month',
      yearlyRenews: 'Your yearly plan renews on {date}',
      readOnly: 'Your account is now read-only',
      cancelled: 'Cancelled: how to get your records',
    },
    security: {
      notice: 'Security notice about your account',
      exportStarted: 'A full export of your data was started',
      subprocessor: 'We are changing a subprocessor',
      maintenance: 'Planned maintenance on {date}',
      exportBefore: 'Export your records before {date}',
    },
  },
} as const

export type Copy = typeof copy

type Value = string | number
/**
 * Fills {placeholders}. A placeholder that repeats ("{n} errors, {n} warnings")
 * takes an array and uses it in order.
 */
export function fill(template: string, values: Record<string, Value | readonly Value[]>): string {
  const used = new Map<string, number>()
  return template.replace(/\{([^{}]+)\}/g, (whole, name: string) => {
    const v = values[name]
    if (v === undefined) throw new Error(`Missing value for {${name}} in "${template}"`)
    if (typeof v === 'string' || typeof v === 'number') return String(v)
    const i = used.get(name) ?? 0
    used.set(name, i + 1)
    const item = v[i]
    if (item === undefined) throw new Error(`Not enough values for {${name}} in "${whole}"`)
    return String(item)
  })
}

/**
 * Picks the singular or the plural form (15 §1 rule 11). English has one form
 * for exactly 1 and another for everything else, zero included: "0 projects".
 */
export function plural<K extends string>(
  group: Record<`${K}_one` | `${K}_other`, string>,
  key: K,
  n: number,
): string {
  return n === 1 ? group[`${key}_one`] : group[`${key}_other`]
}

/** plural() and fill() in one, for the common "{n} thing" case. */
export function count<K extends string>(
  group: Record<`${K}_one` | `${K}_other`, string>,
  key: K,
  n: number,
  values: Record<string, Value | readonly Value[]> = {},
): string {
  return fill(plural(group, key, n), { n, ...values })
}
