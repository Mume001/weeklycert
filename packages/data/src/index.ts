// Server entry. Client components import types from '@wc/data/dto' instead,
// so fixtures never end up in the browser bundle.
export { DEMO_TENANT_SLUG, demoUserIdForRole } from './demo.ts'
export * from './dto/index.ts'
export { NotYetBuiltError } from './not-yet.ts'
export { getRepositories, type Repositories } from './repositories.ts'
