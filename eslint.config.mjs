import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
  },
})
