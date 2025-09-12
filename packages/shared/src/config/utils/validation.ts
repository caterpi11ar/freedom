// Utility functions for config validation and parsing
export function parseEnvValue(value: string): unknown {
  // Try to parse as boolean
  if (value.toLowerCase() === 'true')
    return true
  if (value.toLowerCase() === 'false')
    return false

  // Try to parse as number
  const num = Number(value)
  if (!Number.isNaN(num) && Number.isFinite(num))
    return num

  // Return as string
  return value
}
