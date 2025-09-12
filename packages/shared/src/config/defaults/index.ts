import type { FreedomConfig } from '../types.js'
import process from 'node:process'
import { DEFAULT_ACCOUNTS_CONFIG } from './accounts.js'
import { DEFAULT_SETTINGS_CONFIG } from './settings.js'

export { DEFAULT_ACCOUNTS_CONFIG } from './accounts.js'
// Re-export individual defaults
export { DEFAULT_SETTINGS_CONFIG } from './settings.js'

// Combined default config
export const DEFAULT_CONFIG: FreedomConfig = {
  settings: DEFAULT_SETTINGS_CONFIG,
  accounts: DEFAULT_ACCOUNTS_CONFIG,
}

// Environment variable mapping
export const ENV_MAPPING: Record<string, string> = {
  FREEDOM_THEME: 'settings.theme',
  FREEDOM_VERBOSE: 'settings.cli.verbosity',
  FREEDOM_API_KEY: 'accounts.defaultAccount', // special handling
  FREEDOM_AUTO_UPDATE: 'settings.features.autoUpdate',
  FREEDOM_TELEMETRY: 'settings.features.enableTelemetry',
  FREEDOM_LOCALE: 'settings.cli.locale',
}

// Configuration file search paths
export const CONFIG_PATHS = {
  // User-level config file paths
  user: {
    settings: [
      '~/.freedom/settings.json',
      '~/.config/freedom/settings.json',
    ],
    accounts: [
      '~/.freedom/accounts.json',
      '~/.config/freedom/accounts.json',
    ],
  },

  // Project-level config file paths
  project: {
    settings: [
      './.freedom/settings.json',
      './freedom.settings.json',
    ],
    accounts: [
      './.freedom/accounts.json',
      './freedom.accounts.json',
    ],
  },
}

// Windows platform config paths
if (process.platform === 'win32') {
  CONFIG_PATHS.user.settings.unshift(
    '%APPDATA%/Freedom/settings.json',
    '%LOCALAPPDATA%/Freedom/settings.json',
  )
  CONFIG_PATHS.user.accounts.unshift(
    '%APPDATA%/Freedom/accounts.json',
    '%LOCALAPPDATA%/Freedom/accounts.json',
  )
}
