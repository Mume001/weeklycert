import { defineProject } from 'vitest/config'

// Coverage is configured once, at the root, because thresholds belong to the
// run and not to a single project (spec/12 step 2 asks for 95 % on the engine).
export default defineProject({
  test: {
    name: 'core',
  },
})
