export interface FreedomConfig {
  browser: {
    headless: boolean
    timeout: number
  }
  genshin: {
    serverUrl: string
  }
}

const defaultConfig: FreedomConfig = {
  browser: {
    headless: true,
    timeout: 30000,
  },
  genshin: {
    serverUrl: 'https://ys.mihoyo.com/cloud/#/',
  },
}

export async function getConfig(): Promise<FreedomConfig> {
  return defaultConfig
}
