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

/**
 * The setup tiers, named once (spec/17 §6.1, 15 §3). The site's price table and
 * onboarding step 7 both read these; test/copy.test.ts fails if they drift.
 */
const setupTiers = {
  basic: 'Basic',
  standard: 'Standard',
  full: 'Full',
  waived: 'I will set it up myself',
} as const

export const copy = {
  setupTiers,

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
        text: 'Subscription paused. You can read and export everything. Entering hours and generating reports resume when you unpause.',
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

  // 15 §3 Projekti (screens of 03 §4.4)
  projects: {
    list: {
      meta_one: '{n} active project',
      meta_other: '{n} active projects',
      add: 'Add a project',
      filterLabel: 'Show projects',
      filters: { active: 'Active', paused: 'Paused', closed: 'Closed' },
      columns: {
        project: 'Project',
        prc: 'PRC',
        ourRole: 'Our role',
        nextDeadline: 'Next deadline',
        weekInProgress: 'Week in progress',
        openFindings: 'Open findings',
        actions: 'Actions',
      },
      enterHours: 'Enter hours',
      noFilingDue: 'No filing due',
      noWeeksYet: 'No weeks yet',
      notSet: 'Not set',
      noEntries: 'No entries',
      showAll: 'Show all projects',
      emptyFilter: {
        title: 'No projects with this status',
        body: 'Paused and closed projects are listed under their own tab.',
        action: 'Show active projects',
      },
      // The whole list empty: the text and button of the dashboard (15 §3).
      empty: {
        title: 'No projects yet',
        body: 'A project is one public job with its own PRC number.',
      },
    },
    /** our_role, spec/04 §4. "General contractor", never "prime" (15 §2). */
    roles: {
      prime: 'General contractor',
      sub: 'Subcontractor',
      sub_tier2: 'Second-tier subcontractor',
    },
    /** project_status, words from 03 §4.4. */
    status: {
      draft: 'Draft',
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      archived: 'Archived',
    },
    timeline: {
      meta: 'PRC {prc}',
      cards: {
        prc: 'PRC',
        wd: 'Wage determination',
        awardingBody: 'Awarding body',
        generalContractor: 'General contractor',
        classifications: 'Classifications',
        nextDeadline: 'Next deadline',
      },
      wdValue: '{number}, modification {mod}',
      noWd: 'None. State funding only.',
      weAreGc: 'None. You are the general contractor.',
      classifications_one: '{n} classification',
      classifications_other: '{n} classifications',
      openCurrentWeek: 'Open current week',
      editClassifications: 'Edit classifications',
      editProject: 'Edit project',
      section: 'Every week since the project started',
      sectionNote: 'Payroll numbers must run without gaps.',
      columns: {
        payrollNo: 'Payroll no.',
        weekEnding: 'Week ending',
        status: 'Status',
        workers: 'Workers',
        hours: 'Hours',
        gross: 'Gross on project',
        findings: 'Findings',
        version: 'Version',
        actions: 'Actions',
      },
      // #{n} and v{n} are identifiers, not counts (15 §3 Projekti).
      willBe: 'will be #{n}',
      version: 'v{n}',
      noEntries: 'No entries',
      noWork: 'No work',
      openWeekLabel: 'Open week ending {date}',
      markNoWork: 'Mark no-work week',
      tileLabel: 'Week ending {date}, {status}',
      empty: {
        title: 'No weeks yet',
        body: 'The first week ends on {date}. It shows up here once that week is over.',
      },
    },
    form: {
      newTitle: 'New project',
      settingsTitle: 'Project settings',
      create: 'Create project',
      save: 'Save changes',
      cancel: 'Cancel',
      saved: 'Changes saved.',
      fields: {
        name: { label: 'Project name', hint: 'Your own name for the job.' },
        prcNumber: {
          label: 'PRC number',
          hint: 'From the wage schedule the awarding body gave you.',
        },
        awardingBody: { label: 'Awarding body', hint: 'The public agency that owns the job.' },
        ourRole: { label: 'Our role on this job' },
        generalContractor: {
          label: 'General contractor',
          hint: 'Leave empty if you are the general contractor.',
        },
        projectNumber: {
          label: 'Contract number',
          hint: 'The number on your contract with the awarding body.',
        },
        county: { label: 'County', hint: 'The county decides which wage schedule applies.' },
        startDate: {
          label: 'Start date',
          hint: 'The first week of the project is the week this date falls in.',
        },
        federallyFunded: {
          label: 'This project is also federally funded',
          hint: 'Federal projects also need the WH-347, and overtime starts after 40 hours a week.',
        },
        federalWdNumber: {
          label: 'Wage determination number',
          hint: 'As printed on the federal wage determination.',
        },
        federalWdMod: { label: 'Modification' },
        expectedEndDate: { label: 'Expected end date' },
        siteAddress: {
          label: 'Site address',
          hint: 'Where the work is done. The WH-347 prints it as the project location.',
        },
        workPauses: {
          label: 'Work pauses',
          hint: 'Weeks you already know will have no work.',
          from: 'From',
          to: 'To',
          reason: 'Reason',
          add: 'Add a pause',
          remove: 'Remove this pause',
        },
        retentionYears: {
          label: 'Years to keep records',
          hint: 'Counted from the day the project closes. We keep at least six.',
        },
        status: { label: 'Status' },
        weekEndsOn: {
          label: 'Weeks end on',
          hint: 'Set for the whole company. It cannot change once a project has its first week, because payroll numbers and filed weeks are counted from it.',
        },
      },
      errors: {
        nameRequired: 'Enter a name for the project.',
        prcRequired: 'Enter the PRC number.',
        prcTaken:
          'Another project already uses this PRC number with the same contract number: {Project}. Give this one its own contract number, or open that project.',
        startRequired: 'Enter the start date.',
        wdRequired: 'Enter the wage determination number.',
        modFormat: 'Enter the modification as a whole number.',
        endBeforeStart: 'The expected end date is before the start date.',
        pauseOrder: 'This pause ends before it starts.',
        retentionMin: 'We keep records for at least six years.',
      },
      /**
       * Not an error and it blocks nothing: the PRC format is unverified
       * (spec/13 A6), so a number in another shape is only worth a second look.
       */
      warnings: {
        prcFormat: 'Every PRC number we have seen has ten digits. Check this one before you file.',
      },
      summary_one: '{n} field needs attention.',
      summary_other: '{n} fields need attention.',
    },
    closed: {
      text: 'This project is closed. You can read everything, but nothing can be changed.',
      action: 'Change the status',
    },
    classifications: {
      title: 'Classifications and rates',
      subtitle: 'Names come from the official NY list.',
      columns: {
        classification: 'Classification',
        baseRate: 'Base rate',
        supplement: 'Supplement',
        effectiveFrom: 'Effective from',
        effectiveTo: 'Effective to',
        otCodes: 'OT codes',
        apprenticeRatio: 'Apprentice ratio',
        actions: 'Actions',
      },
      noEndDate: 'No end date',
      notSet: 'Not set',
      source: {
        manual: 'Entered by hand',
        pasted: 'Pasted from the schedule',
        cache: 'From the wage schedule',
      },
      missingTitle: 'A rate is missing for the current week',
      missingRate:
        '{Classification} has no rate for the week ending {date}. Add a new rate version.',
      add: 'Add a classification',
      edit: 'Edit',
      newVersion: 'Add a new rate version',
      fields: {
        classification: { label: 'Classification', placeholder: 'Pick from the official NY list' },
        displayLabel: {
          label: 'Your label',
          hint: 'What your crew calls it. The file uses the official name.',
        },
        baseRate: { label: 'Base rate' },
        supplement: { label: 'Supplement' },
        otCodes: {
          label: 'OT codes',
          hint: 'From the OVERTIME PAGE of the wage schedule, separated by commas.',
        },
        effectiveFrom: { label: 'Effective from' },
        apprenticeRatio: {
          label: 'Apprentice ratio',
          hint: 'Apprentices per journeyworker, as the program allows.',
        },
      },
      addSubmit: 'Add classification',
      versionSubmit: 'Add rate version',
      save: 'Save changes',
      cancel: 'Cancel',
      versionTitle: 'New rate version for {Classification}',
      versionBody:
        'The current rate stays on every week before this date. Weeks from this date on use the new rate.',
      rateLocked:
        'A signed week uses this rate, so it cannot change. Add a new rate version instead.',
      errors: {
        classificationRequired: 'Pick a classification.',
        alreadyOnProject:
          'This classification is already on the project. Add a new rate version instead.',
        rateFormat: 'Enter the rate in dollars and cents.',
        otCodesRequired: 'Enter at least one OT code.',
        otCodeUnknown: '{code} is not an NY overtime code.',
        effectiveFromRequired: 'Enter the date the rate starts.',
        versionAfter: 'The new version has to start after {date}, when the current one starts.',
      },
      empty: {
        title: 'No classifications yet',
        body: 'Add the classifications that work on this project, with the rates from its wage schedule.',
      },
    },
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

  // 15 §3 Onboarding (03 §4.3)
  onboarding: {
    meta: 'Step {n} of 7',
    progressLabel: 'Setup progress',
    steps: [
      'Company',
      'First project',
      'Classifications',
      'Workers',
      'Fringe plans',
      'First week',
      'Billing',
    ],
    done: 'done',
    continue: 'Continue',
    back: 'Back',
    skip: 'Skip for now',
    toDashboard: 'Go to the dashboard',
    locked: {
      company:
        'Only the owner or an administrator can enter the company profile. Ask {Owner name}.',
      billing: 'Only the owner can choose how to pay. Ask {Owner name}.',
      missing: 'Still missing: {fields}.',
    },
    noProject: 'Create the first project in step 2 first.',
    company: {
      intro: 'The company as it appears on your contracts and on every filing.',
      fields: {
        legalName: { label: 'Legal name', hint: 'As it appears on your contracts.' },
        addressLine1: { label: 'Address line 1' },
        addressLine2: { label: 'Address line 2' },
        city: { label: 'City' },
        state: { label: 'State' },
        zip: { label: 'ZIP code' },
        fein: {
          label: 'FEIN',
          hint: 'Your federal employer identification number, nine digits. It goes on the WH-347 and into the NY file.',
          onFile: 'On file, ending in {last4}. Leave it empty to keep it.',
        },
        nysRegistrationNumber: {
          label: 'NYS contractor registration number',
          hint: 'From your Certificate of Contractor Registration.',
        },
        nysRegistrationExpiresOn: { label: 'Registration expires on' },
        defaultOurRole: {
          label: 'Your usual role on public jobs',
          hint: 'New projects start with this role. You can change it per project.',
        },
        weekEndsOn: {
          label: 'Weeks end on',
          hint: 'The last day of your payroll week. It cannot change once a project has its first week.',
        },
      },
      errors: {
        legalNameRequired: 'Enter the legal name.',
        addressRequired: 'Enter the address: line 1, city and ZIP code.',
        zipFormat: 'Enter a five-digit ZIP code.',
        feinFormat: 'Enter the FEIN as nine digits.',
        weekEndLocked: 'A project already has weeks, so the week end cannot change.',
      },
    },
    project: { intro: 'Your first project. You can add more later under Projects.' },
    classifications: {
      intro:
        'Add the classifications that work on this project, with the rates from its wage schedule.',
      paste: {
        open: 'Paste a table from the wage schedule',
        label: 'Rows copied from the wage schedule',
        hint: 'One classification per line: the name, the base rate, the supplement, then the OT codes if the schedule lists them. Nothing is saved until you confirm.',
        suggest: 'Suggest rows',
        effectiveFrom: 'Effective from',
        columns: {
          line: 'Line',
          classification: 'Classification',
          baseRate: 'Base rate',
          supplement: 'Supplement',
          otCodes: 'OT codes',
          status: 'Status',
        },
        status: {
          ready: 'Ready',
          notOfficial: 'Not on the official NY list',
          noRate: 'No rate on this line',
          noOtCodes: 'No OT codes on this line',
          onProject: 'Already on the project',
        },
        add_one: 'Add {n} classification',
        add_other: 'Add {n} classifications',
        added_one: '{n} classification added.',
        added_other: '{n} classifications added.',
        noneReady: 'No row is ready to add. Check the lines marked above.',
      },
    },
    workers: {
      intro: 'Add the workers who will be on the first week, or import a list.',
      import: 'Import workers',
      count_one: '{n} worker so far',
      count_other: '{n} workers so far',
    },
    fringe: {
      intro: 'The benefit plans you pay into, then the credit per hour for each worker.',
      worker: { label: 'Worker', none: 'Pick a worker' },
    },
    week: {
      intro: 'Pick the week to start with. The grid opens on it.',
      label: 'Week ending',
      open: 'Open the grid',
    },
    billing: {
      intro:
        'The subscription is $79 a month after a 14-day trial. Setup is paid once, today, and we build your data for you.',
      group: 'How do you want to start?',
      tiers: {
        basic: {
          name: setupTiers.basic,
          price: '$149',
          detail: 'One company, up to 2 active projects and 10 workers.',
        },
        standard: {
          name: setupTiers.standard,
          price: '$299',
          detail: 'Up to 5 projects, 30 workers and union fringe plans.',
        },
        full: {
          name: setupTiers.full,
          price: '$499',
          detail:
            'Up to 12 projects, 75 workers, apprentice ratios and one import from your current system.',
        },
        waived: {
          name: setupTiers.waived,
          price: '$0',
          detail: 'The product is the same. You start the trial and enter the rest yourself.',
        },
      },
      pay: 'Continue to payment',
      mock: 'Payment is not connected in this demo. Your choice is saved.',
      complete: 'Setup is complete.',
    },
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
    metaSigned: '{WeekEndDay} {date} · payroll no. #{n}',
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
    columns: {
      worker: 'Worker',
      /**
       * Not a column any more (03 §4.5): the worker cell carries the name, the
       * classification under it and a J or RA badge. This is the badge's full
       * name, in its title attribute.
       */
      level: 'J/RA',
      total: 'Total',
      st: 'ST',
      ot: 'OT',
      stRate: 'ST rate',
      otRate: 'OT rate',
      supplement: 'Supplement',
      gross: 'Gross',
    },
    /** The four derived columns fold away when the grid is too narrow (03 §4.5). */
    showRates: 'Show rates and gross',
    dayHeader: '{WeekEndDay} {D}',
    weekTotal: 'Week total',
    noHours: 'No hours this week',
    cellLabel: 'Hours for {Name} on {date}',
    otAbbr: 'OT',
    otFull: 'Overtime',
    fringe: {
      plan: 'Plan',
      cash: 'Cash',
      mixed: 'Plan and cash',
      missing: 'Not set',
    },
    applyFix: 'Apply this fix',
    acknowledge: 'I understand, this is intentional',
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
    columns: {
      worker: 'Worker',
      classification: 'Classification',
      st: 'ST',
      ot: 'OT',
      stRate: 'ST rate',
      otRate: 'OT rate',
      fringeCredit: 'Fringe credit',
      grossProject: 'Gross on project',
      grossAllWork: 'Gross for all work',
      deductions: 'Deductions',
      netPay: 'Net pay',
    },
    generate: 'Generate the draft',
    requestSignature: 'Request signature',
    backToHours: 'Back to hours',
    generating: 'Generating the draft...',
    /** v{n} is a label, not a count. */
    ready: 'Draft v{n} is ready.',
    warningsBlock_one: '{n} warning needs a look before you can generate the report.',
    warningsBlock_other: '{n} warnings need a look before you can generate the report.',
    wh347Card: 'WH-347 for the general contractor',
    byHand: { fein: 'FEIN', nysRegistration: 'NYS registration number' },
    sampleNote: 'An example of what the file will hold. Real files come with the generator.',
    payroll: {
      title: 'Deductions and all work',
      hint: 'The hours do not carry these. Import them from payroll, or type them here.',
      grossAllWork: 'Gross for all work',
      netPay: 'Net pay',
      deduction: 'Deduction',
      amount: 'Amount',
      add: 'Add a deduction',
      remove: 'Remove this deduction',
      save: 'Save payroll figures',
    },
    /** deduction_kind, spec/04 §4. */
    deductionKinds: {
      federal_tax: 'Federal tax',
      state_tax: 'State tax',
      local_tax: 'Local tax',
      fica: 'FICA',
      medicare: 'Medicare',
      sdi: 'SDI',
      pfl: 'PFL',
      union_dues: 'Union dues',
      garnishment: 'Garnishment',
      insurance: 'Insurance',
      retirement_401k: 'Retirement 401(k)',
      other: 'Other',
    },
  },

  // 15 §3 Potpis
  sign: {
    title: 'Certify this week',
    statement: 'Statement of compliance',
    statementNote: 'We tick a box from your data, never by hand. Each one says why.',
    reasons: {
      always: 'Always required.',
      apprentices: 'Because apprentices are on this report.',
      fringe: 'Because fringe benefits are on this report.',
    },
    notTicked: {
      apprentices: 'Not ticked: no apprentices on this report.',
      fringe: 'Not ticked: no fringe benefits on this report.',
    },
    fields: {
      fullName: 'Full name',
      title: 'Title',
      phone: 'Phone',
      email: 'Email',
    },
    understand: 'I understand what I am signing.',
    criminalWarning:
      'Signing this is a statement to the federal government. A false statement can be a crime under 18 U.S.C. 1001 and 31 U.S.C. 3729, and what you file can be released under a Freedom of Information Act request.',
    errors: {
      nameRequired: 'Enter the name that goes on the certification.',
      titleRequired: 'Enter your title.',
      reauthRequired: 'Enter your password or your two-factor code.',
      understandRequired: 'Tick the box to confirm you understand.',
    },
  },

  // 15 §3 Izvještaji i predaja
  reports: {
    title: 'Reports and filing',
    columns: {
      version: 'Version',
      generated: 'Generated',
      signedBy: 'Signed by',
      status: 'Status',
      files: 'Files',
    },
    empty: {
      title: 'No report yet',
      body: 'A report is generated on the review screen, and signed there.',
      action: 'Review and certify',
    },
    filing: {
      title: 'Record the filing',
      confirmation: 'Confirmation number',
      filedOn: 'Filed on',
      submit: 'Record submission',
    },
    portal: {
      title: 'Portal response',
      accepted: 'Accepted',
      rejected: 'Rejected',
      reason: 'What the portal said',
    },
    toPrime: {
      record: 'Record as sent to the general contractor',
      email: 'Email',
    },
    correction: {
      note: 'A correction is a new version of this week. The old one stays.',
      field: 'What is being corrected',
      error: 'Say what is being corrected.',
    },
    errors: {
      confirmationRequired: 'Enter the confirmation number the portal gave you.',
    },
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
    list: {
      meta_one: '{n} active worker',
      meta_other: '{n} active workers',
      add: 'Add a worker',
      import: 'Import workers',
      filterLabel: 'Show workers',
      filters: { active: 'Active', inactive: 'Inactive' },
      search: 'Search by name or worker number',
      columns: {
        worker: 'Worker',
        classification: 'Default classification',
        level: 'Level',
        projects: 'Projects',
        status: 'Status',
        lastWeek: 'Last week with hours',
      },
      notSet: 'Not set',
      noProjects: 'None yet',
      noHours: 'No hours yet',
      emptyFilter: {
        title: 'No workers with this status',
        body: 'Inactive workers are listed under their own tab.',
        action: 'Show active workers',
      },
      noMatch: 'No worker matches that name or number.',
    },
    levels: {
      J: { short: 'J', label: 'Journeyworker' },
      RA: { short: 'RA', label: 'Registered apprentice' },
      F: { short: 'F', label: 'Foreman' },
      O: { short: 'O', label: 'Owner-operator' },
    },
    status: { active: 'Active', inactive: 'Inactive' },
    form: {
      newTitle: 'New worker',
      sections: {
        basics: 'Basics',
        identification: 'Identification',
        address: 'Home address and phone',
        apprentice: 'Apprenticeship',
        fringe: 'Fringe plans',
        history: 'Week history',
      },
      create: 'Create worker',
      save: 'Save changes',
      cancel: 'Cancel',
      saved: 'Changes saved.',
      summary_one: '{n} field needs attention.',
      summary_other: '{n} fields need attention.',
      fields: {
        firstName: { label: 'First name' },
        middleName: {
          label: 'Middle name',
          hint: 'Written out, not an initial. The portal takes up to 45 characters.',
        },
        lastName: { label: 'Last name' },
        workerNumber: {
          label: 'Worker number',
          hint: 'The number in your payroll system. Imports match on it.',
        },
        defaultClassificationId: { label: 'Default classification', none: 'None' },
        level: { label: 'Level' },
        hireDate: { label: 'Hire date' },
        status: { label: 'Status' },
        ssnLast4: {
          label: 'Last 4 of SSN',
          hint: 'Four digits. Leave it empty if you enter a date of birth.',
        },
        dateOfBirth: {
          label: 'Date of birth',
          hint: 'Only if you do not have the last four digits of the SSN.',
        },
        address1: { label: 'Address line 1' },
        address2: { label: 'Address line 2' },
        city: { label: 'City' },
        state: { label: 'State' },
        postalCode: { label: 'ZIP code' },
        postalCodeExt: { label: 'ZIP+4' },
        phone: { label: 'Phone' },
        programName: { label: 'Program' },
        registrar: { label: 'Registrar' },
        programRegistrationNo: { label: 'Registration number' },
        trade: { label: 'Trade' },
        periodNo: { label: 'Period', hint: 'The year or period of the apprenticeship.' },
        pctOfJourney: { label: 'Percent of the journeyworker rate' },
        validFrom: { label: 'Valid from' },
        validTo: { label: 'Valid to' },
      },
      registrars: {
        oa: 'Office of Apprenticeship (federal)',
        saa: 'State Apprenticeship Agency',
        nysdol: 'NYSDOL',
      },
      hidden: 'Hidden. Every view is logged.',
      show: 'Show',
      showLabels: {
        ssnLast4: 'Show the last 4 of the SSN',
        dateOfBirth: 'Show the date of birth',
        address: 'Show the full address and phone',
      },
      shown: 'Shown. This view was logged.',
      noAddress: 'No address on file. The NY portal requires one.',
      noProgram:
        'No registered apprenticeship program on file. Until one is added, the full journeyworker rate applies.',
      fringeColumns: { plan: 'Plan', credit: 'Credit per hour', from: 'From', to: 'To' },
      noEndDate: 'No end date',
      noFringe: 'No fringe plans for this worker.',
      allocation: {
        add: 'Add a plan for this worker',
        edit: 'Edit',
        editLabel: 'Edit {Plan}',
        create: 'Add plan',
        save: 'Save changes',
        cancel: 'Cancel',
        fields: {
          plan: { label: 'Plan', none: 'Pick a plan' },
          credit: {
            label: 'Credit per hour',
            hint: 'Leave it empty to use the credit of the plan.',
          },
          from: { label: 'From' },
          to: {
            label: 'To',
            hint: 'Set a date to end this plan for the worker. Weeks before it keep the credit.',
          },
        },
        noPlans: 'The company has no fringe plans yet. Add them on the Fringe plans page.',
        errors: {
          planRequired: 'Pick a plan.',
          amountFormat: 'Enter the amount in dollars and cents.',
          fromRequired: 'Enter the date the plan starts for this worker.',
          toBeforeFrom: 'The end date is before the start date.',
          allocationTaken: 'This worker already has this plan from that date.',
        },
      },
      historyColumns: { weekEnding: 'Week ending', project: 'Project', hours: 'Hours' },
      noHistory: 'No weeks with hours yet.',
      errors: {
        firstRequired: 'Enter the first name.',
        lastRequired: 'Enter the last name.',
        middleLength: 'The middle name can be at most 45 characters.',
        ssnFormat: 'Enter exactly four digits. We never store a full Social Security number.',
        idRequired: 'Enter the last 4 of the SSN or a date of birth.',
        idBoth: 'Enter the last 4 of the SSN or a date of birth, not both. The portal takes one.',
        numberTaken: 'Another worker already has this worker number: {Worker}.',
        addressIncomplete: 'Enter the rest of the address: line 1, city, state and ZIP code.',
        address1Length: 'Address line 1 can be at most 42 characters.',
        address2Length: 'Address line 2 can be at most 42 characters.',
        cityLength: 'City can be at most 40 characters.',
        zipFormat: 'Enter a five-digit ZIP code.',
        zipExtFormat: 'Enter four digits, or leave it empty.',
        programRequired: 'Enter the program name.',
        tradeRequired: 'Enter the trade.',
        periodFormat: 'Enter the period as a whole number.',
        pctRange: 'Enter a percent between 40 and 95.',
        validFromRequired: 'Enter the date the registration starts.',
      },
    },
  },

  // 15 §3 Planovi beneficija
  fringe: {
    meta_one: '{n} plan',
    meta_other: '{n} plans',
    add: 'Add a fringe plan',
    columns: {
      plan: 'Plan',
      kind: 'Kind',
      funding: 'Funding',
      planNumber: 'Plan number',
      annualized: 'Annualized',
      workers: 'Workers',
      actions: 'Actions',
    },
    kinds: {
      health_welfare: 'Health/Welfare',
      vacation_holiday: 'Vacation/Holiday',
      apprenticeship_training: 'Apprenticeship/Training',
      pension: 'Pension',
      other: 'Other',
    },
    funding: { plan_contribution: 'Plan contribution', cash_in_lieu: 'Cash in lieu' },
    yes: 'Yes',
    no: 'No',
    notSet: 'Not set',
    edit: 'Edit',
    form: {
      newTitle: 'New fringe plan',
      editTitle: 'Edit {Plan}',
      create: 'Create plan',
      save: 'Save changes',
      cancel: 'Cancel',
      saved: 'Changes saved.',
      fields: {
        name: { label: 'Plan name' },
        kind: { label: 'Kind' },
        funding: { label: 'Funding' },
        planNumber: { label: 'Plan number', hint: 'The number the fund gave the plan.' },
        provider: { label: 'Provider' },
        hourlyCredit: {
          label: 'Credit per hour',
          hint: 'If the fund states it per hour. Leave it empty to work it out from the yearly cost.',
        },
        annualCost: { label: 'Yearly cost' },
        annualHoursBasis: {
          label: 'Hours worked in a year',
          hint: 'All hours on all jobs, private ones too. Leave it empty to use the company setting.',
        },
        annualize: {
          label: 'Annualize this plan',
          hint: 'Turn off only for a pension plan with immediate participation and vesting.',
        },
        isLegallyRequired: {
          label: 'Required by law',
          hint: 'FICA, workers compensation and unemployment insurance are never fringe credit.',
        },
      },
      errors: {
        nameRequired: 'Enter a name for the plan.',
        amountFormat: 'Enter the amount in dollars and cents.',
        hoursFormat: 'Enter the hours as a whole number above zero.',
        creditOrCost: 'Enter a credit per hour or a yearly cost.',
      },
    },
    converter: {
      title: 'Monthly premium to a credit per hour',
      monthly: 'Monthly premium',
      hours: 'Hours worked in a year',
      yearly: '{monthly} a month is {yearly} a year.',
      hourly: '{yearly} divided by {hours} hours is {hourly} per hour.',
      note: 'Without a record of the hours actually worked, New York counts 2,080 hours a year, or 1,820 for 7-hour days. Count every hour, private jobs too.',
      use: 'Use this credit',
    },
    empty: {
      title: 'No fringe plans yet',
      body: 'Add the benefit plans you pay into, so their credit counts toward the supplement.',
      action: 'Add a fringe plan',
    },
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
    // One sentence cannot inflect three counts at once, so 15 §3 splits it into
    // a title and three counted lines.
    applied: 'Import finished',
    appliedWeek: 'Week ending {date}',
    rowsImported_one: '{n} row imported',
    rowsImported_other: '{n} rows imported',
    workers_one: '{n} worker',
    workers_other: '{n} workers',
    rowsSkipped_one: '{n} row skipped',
    rowsSkipped_other: '{n} rows skipped',
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

  // 15 §3 Javni sajt. Structure is 16 §4, section by section. Three rules run
  // through all of it (19 §8, 16 §6): no phone number and no postal address
  // until a real one exists, no claim about customers, reviews or logos, and no
  // picture of a product that does not exist yet.
  site: {
    nav: {
      how: 'How it works',
      output: 'What you get',
      pricing: 'Pricing',
      questions: 'Questions',
      about: 'Who we are',
      startFree: 'Start free',
      /** The human option in the header. A phone number goes here when one exists. */
      contact: 'support@weeklycert.com',
    },
    /**
     * 15 §3 block 14. There is no /register and no app.weeklycert.com until the
     * gate of ten payments (19 §9), so the primary action opens an email
     * instead of a screen that does not exist. "Log in" is not redirected but
     * removed from the header (16 §4 row 1): a button that opens an email does
     * not mean log in. `nav.startFree`, `hero.primary` and `pricing.cta` are
     * the labels that come back the day sign-up does, along with "Log in";
     * nothing renders them in the meantime.
     */
    signup: {
      button: 'Ask for an account',
      note: 'Sign up is not open yet. Email us and we will set your account up by hand.',
      subject: 'Account request from weeklycert.com',
    },
    footer: {
      description:
        'Certified payroll for New York subcontractors. NYSDOL portal XML and federal WH-347 from one weekly entry.',
      product: 'Product',
      company: 'Company',
      legalLine: 'Not a law firm and not a payroll provider. You sign your own certifications.',
      lastLine: 'Built for New York. On purpose.',
    },
    hero: {
      title: 'Your weekly New York certified payroll, XML and WH-347, done in ten minutes.',
      // No claim that the two files exist: the generator is step 5 (19 §11).
      subtitle:
        'Built for New York subcontractors with 3 to 30 workers. Enter hours once. The overtime codes and the fringe math are checked as you type, and that same entry is what the NYSDOL portal file and the federal WH-347 will be built from.',
      primary: 'Start free for 14 days',
      secondary: 'See what you get',
      micro: [
        '$79 a month, cancel anytime',
        'We do the setup for you',
        'New York only, on purpose',
      ],
      // The days are counted, never named: the firm picks its week ending day
      // (15 §1 rule 12).
      shotAlt:
        'The WeeklyCert hours grid: one row per worker, seven days of the week, and the overtime and the findings worked out while the hours are typed.',
    },
    numbers: [
      { value: '10 minutes', label: 'a typical week, from the first hour typed to signed' },
      { value: '2 filings', label: 'from one entry: the NYSDOL portal XML and the federal WH-347' },
      { value: '63 checks', label: 'run against the week before you can certify it' },
      { value: '$0', label: 'to set up, if you would rather do it yourself' },
    ],
    output: {
      title: 'The two documents this exists to produce',
      lede: 'Every other tool in this category shows you a stock photo of a hard hat. These are the two files a New York week ends in, and what goes in each one.',
      // The tags say what the portal and the form require, not what we have
      // already built: the generator is step 5, and neither the XSD nor the
      // WH-347 field names are in izvori/ yet (13 A1 and A8b). The worker
      // ceiling that used to be quoted here came from neither.
      xml: {
        title: 'NYSDOL portal file',
        tag: 'what the portal requires',
        body: 'One project, one week, in the shape the portal expects. When the portal rejects a file, you will be able to paste the error and we will name the worker and the field it came from.',
      },
      wh347: {
        title: 'Federal WH-347',
        tag: 'the federal form',
        body: 'It will be filled into the actual government form rather than a lookalike, with the Statement of Compliance on page two. Worker home addresses are never printed.',
      },
      /** No sample downloads until the generator exists (12 step 3b, 19 §11). */
      note: 'Neither file is generated yet. The generator is the next piece of work, and sample downloads go up the day it does.',
    },
    stakes: {
      eyebrow: 'Why this changed in 2026',
      title: 'Paper is gone. The portal is not optional.',
      lede: 'Since the start of 2026, certified payroll for New York public work goes through the NYSDOL electronic portal. The file has to match the state schema exactly, and the classification names have to match the state list word for word.',
      close:
        'Nothing here is a scare tactic. These are the published rules, and you can check every one of them.',
      facts: [
        {
          term: 'Who has to file',
          value: 'Every contractor and subcontractor on Article 8 public work',
        },
        { term: 'How often', value: 'At least every 30 days from the project start date' },
        { term: 'Grace period', value: '14 days' },
        { term: 'After that', value: '$100 per day, per the NYSDOL FAQ' },
        { term: 'Federal jobs too', value: 'WH-347 within 7 days of the pay date, 29 CFR 3.4' },
        { term: 'Records kept', value: 'Six years' },
      ],
    },
    how: {
      eyebrow: 'How it works',
      title: 'Three steps, every week',
      lede: 'The first week we set up with you. After that it is the same three steps, and most of it is already filled in from last week.',
      steps: [
        {
          title: 'Put in the hours',
          body: "Type them into a grid that works like a spreadsheet, or import the export from QuickBooks Time, Gusto, ADP, Paychex or your own file. Last week's crew is already there.",
        },
        {
          title: 'We check the math',
          body: 'Overtime by the OT code on your wage schedule, not a guess. Fringe credit against what the determination requires. Apprentice ratios and registration. Deduction totals that have to add up to net pay.',
        },
        {
          title: 'Sign and file',
          body: 'Your certifying officer signs electronically, which the Department of Labor accepts. When the generator is finished you will download the XML for the portal and the WH-347 for the general contractor.',
        },
      ],
    },
    compare: {
      eyebrow: 'The difference',
      title: 'What Friday afternoon looks like',
      them: 'A spreadsheet',
      us: 'WeeklyCert',
      rows: [
        {
          topic: 'Entering the crew',
          them: 'Retype the same twelve names every week',
          us: 'Last week is already loaded',
        },
        {
          topic: 'Overtime',
          them: 'You remember the rule, or you do not',
          us: 'Read from the OT codes on your PRC schedule',
        },
        {
          topic: 'Fringe benefits',
          them: 'Annualised by hand, if at all',
          us: 'Checked against the determination, shortfall shown per hour',
        },
        {
          topic: 'Apprentices',
          them: 'Nobody checks the ratio until an audit does',
          us: 'Flagged the moment the ratio breaks',
        },
        {
          topic: 'The portal file',
          them: 'Typed into the portal, worker by worker',
          us: 'One file for the whole week',
        },
        {
          topic: 'A rejected upload',
          them: 'A line number and a cryptic message',
          us: 'Paste it in and we will name the worker and the field',
        },
        {
          topic: 'Six-year records',
          them: 'A folder somewhere',
          us: 'Every version kept, with the exact input it came from',
        },
      ],
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'One price. Published, because you should not have to ask.',
      lede: 'The established tools in this category quote you after a discovery call. Their published starting points run from $175 to $400 a month, with setup fees from about $995 to $4,995.',
      planName: 'Everything, one plan',
      amount: '$79',
      period: 'per month',
      note: 'Unlimited projects, unlimited workers, unlimited filings. Two months free if you pay yearly.',
      includes: [
        'NYSDOL portal XML and federal WH-347',
        'Overtime, fringe and apprentice checks before you sign',
        'Import from your payroll or time system',
        'Deadline reminders at 10, 5, 2 and 0 days',
        'Six years of records, exportable any time',
        'Your bookkeeper and your signer, at no extra cost',
      ],
      cta: 'Start free for 14 days',
      ctaNote: 'Card required, nothing charged for 14 days.',
      setupTitle: 'Setup, paid once',
      setupBody:
        'We build your company, projects, classifications, rates, fringe plans and workers from your files, then file the first week together on a call.',
      tiers: [
        {
          key: 'basic',
          name: setupTiers.basic,
          detail: 'one project, up to 10 workers',
          price: '$149',
        },
        {
          key: 'standard',
          name: setupTiers.standard,
          detail: 'up to 5 projects, 30 workers, union fringe plans, one training call',
          price: '$299',
        },
        {
          key: 'full',
          name: setupTiers.full,
          detail: 'up to 12 projects, 75 workers, apprentice ratios, 12 weeks of history',
          price: '$499',
        },
        {
          key: 'waived',
          name: setupTiers.waived,
          detail: 'the product is the same',
          price: '$0',
        },
      ],
      guarantee:
        'Full refund of the setup fee if we do not have you live within ten business days.',
    },
    security: {
      eyebrow: "Your workers' data",
      title: 'What we hold, and what we refuse to hold',
      points: [
        'We never store a full Social Security number. The state accepts the last four digits or a date of birth, so that is all we keep. There is no column for a full Social Security number anywhere in our database.',
        'Home addresses and dates of birth are encrypted with a key that belongs to your company alone. Every time one is read, it is logged, and you can see that log.',
        'All data is stored and processed in United States data centres.',
        'Two-factor authentication is required for anyone who can sign a certification.',
        "We keep a written information security program under the New York SHIELD Act, and we will send it to your general contractor's risk team on request.",
      ],
      refuse:
        'We do not claim a SOC 2 report we do not have, and we do not say "bank-level encryption". The list above is what we actually do.',
    },
    faq: {
      eyebrow: 'Questions people actually ask',
      title: 'Before you sign up',
      items: [
        {
          q: 'Do you file with NYSDOL for me, or do I still upload it?',
          a: 'You upload it. The state portal has no API, which the Department of Labor states plainly in its own bulk upload guide, so no software can file for you. What we will do is produce the file for you, tell you exactly what to type into the portal by hand, and record the confirmation number so your history is complete.',
        },
        {
          q: 'Do I have to change payroll providers?',
          a: 'No. Keep Gusto, ADP, Paychex, QuickBooks or your accountant. We only need hours and the pay figures, and we import them from the exports those systems already produce.',
        },
        {
          q: 'What about weeks when nobody worked?',
          a: 'You still have to report them, and the portal does not accept a file for them. We track which weeks are missing, tell you which ones to mark as no-work in the portal, and keep the payroll numbers running without gaps, which is what an auditor looks at first.',
        },
        {
          q: 'My job is in New York City. Does that work?',
          a: "Not yet, and we will say so before you pay. New York City public improvement and roadway excavation projects go through the City's own system, not the NYSDOL portal. If all your work is in the five boroughs, we are the wrong tool today. If you have both, we cover the state jobs and tell you plainly which ones we do not.",
        },
        {
          q: 'How long is setup, really?',
          a: 'Seven business days from the day you pay, and most of that is waiting on your spreadsheet. Our part is a kickoff call, building your data, and a handover where we file your first week together. If we miss ten business days, the setup fee comes back.',
        },
        {
          q: 'Who are you?',
          // Pointed at a section that named a person, and no longer does
          // (16 §4 row 13). It says what the company is, without a name, a
          // location, or a team size nobody can check.
          a: 'WeeklyCert builds certified payroll software for New York public work, and nothing else. Your email is answered by someone who works on the product itself, not by a call centre. What you do not get in exchange is cover around the clock.',
        },
        {
          q: 'What happens to my records if I cancel?',
          a: 'New York requires you to keep certified payroll records for six years. You get read-only access and a full export for 30 days after cancelling, and three reminders before that window closes. Export is one button, any time, whether you are a customer or not.',
        },
        {
          q: 'What if the math is wrong?',
          a: 'You sign the certification, not us, and the classification you pick is your determination. What we guarantee is the arithmetic and the file format. Every calculation rule we apply is written down, cites the regulation it comes from, and is tested against worked examples we publish.',
        },
      ],
    },
    // 16 §4 row 13: the section is about the company, not about a person. No
    // name, no face, no initials, and no location of the owner. The size of the
    // team, an office and an address are not invented to fill the gap.
    about: {
      eyebrow: 'Who we are',
      title: 'One state, one product',
      body: 'WeeklyCert builds certified payroll software for New York public work, and nothing else. Every support email is read and answered by someone who works on the product itself, not a call centre. Your data stays in United States data centres, under the security program described above.',
      facts: [
        { term: 'Support hours', value: '9 to 16 Eastern, Monday to Friday' },
        { term: 'Anything blocking a filing', value: 'answered within 2 business hours' },
        { term: 'Email', value: 'support@weeklycert.com' },
      ],
    },
    cta: {
      title: 'Try it on your next week',
      body: 'Fourteen days free. If it does not save you an afternoon, cancel in two clicks and take your records with you.',
      button: 'Start free for 14 days',
    },
    legal: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      dpa: 'Data Processing Agreement',
      // The documents themselves are bought and reviewed by counsel (18 §5).
      // Nothing legal is written in this repository.
      pending:
        'This document is being prepared with counsel and will be published here before the first paid account. Ask for the current draft and we will send it.',
      contact: 'support@weeklycert.com',
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
