import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'data',
    env: { MOCK_DELAY_MS: '0' },
  },
})
