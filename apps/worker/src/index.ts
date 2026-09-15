// pg-boss consumers (spec/09 §3): report.generate, import.parse,
// billing.process_event, tenant.purge, reminders, retention.
// Nothing runs in the mock phase: the worker needs Postgres, which arrives in
// step 4, after the gate in spec/12.
export {}
