import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['node_modules', 'dist', 'gemini-cli', '*.md'],
  rules: {
    'no-console': 'off',
    'no-new': 'off',
    'regexp/no-unused-capturing-group': 'off',
  },
})
