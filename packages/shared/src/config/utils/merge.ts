// Utility functions for config merging
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length)
    return target

  const result = { ...target }

  for (const source of sources) {
    if (source && typeof source === 'object') {
      for (const key in source) {
        const sourceValue = source[key]
        const targetValue = result[key]

        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)
          && targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue)
        }
        else if (sourceValue !== undefined) {
          result[key] = sourceValue as T[Extract<keyof T, string>]
        }
      }
    }
  }

  return result
}
