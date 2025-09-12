import type { BaseConfigManager as IBaseConfigManager } from '../types.js'

export abstract class BaseConfigManager<T> implements IBaseConfigManager<T> {
  protected config!: T

  abstract load(): Promise<void>
  abstract validate(config: unknown): T
  abstract merge(...configs: Partial<T>[]): T
  abstract get<K extends keyof T>(key: K): T[K]
  abstract set<K extends keyof T>(key: K, value: T[K]): Promise<void>
  abstract persist(): Promise<void>

  getConfig(): T {
    return { ...this.config } as T
  }

  protected isLoaded(): boolean {
    return this.config !== undefined
  }

  protected ensureLoaded(): void {
    if (!this.isLoaded()) {
      throw new Error('Config not loaded. Call load() first.')
    }
  }
}
