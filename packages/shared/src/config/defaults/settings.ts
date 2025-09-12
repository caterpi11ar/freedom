import type { SettingsConfig } from '../types.js'

export const DEFAULT_SETTINGS_CONFIG: SettingsConfig = {
  theme: 'light',
  features: {
    autoUpdate: false,
    enableTelemetry: false,
    allowRemoteControl: false,
  },
  cli: {
    verbosity: 'normal',
    interactive: true,
    locale: 'zh-CN',
  },
}
