// 缓存管理器 - 提供内存缓存和智能缓存策略
export interface CacheEntry<T> {
  data: T
  timestamp: Date
  expiry?: Date
  accessCount: number
  lastAccessed: Date
}

export interface CacheConfig {
  maxSize: number
  defaultTTL: number // 默认过期时间(毫秒)
  cleanupInterval: number // 清理间隔(毫秒)
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 30 * 60 * 1000, // 30分钟
      cleanupInterval: 5 * 60 * 1000, // 5分钟
      ...config,
    }

    this.startCleanup()
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = new Date()
    const expiry = ttl ? new Date(now.getTime() + ttl) : new Date(now.getTime() + this.config.defaultTTL)

    this.cache.set(key, {
      data,
      timestamp: now,
      expiry,
      accessCount: 0,
      lastAccessed: now,
    })

    // 如果超过最大大小，清理最旧的条目
    if (this.cache.size > this.config.maxSize) {
      this.evictOldest()
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // 检查是否过期
    if (entry.expiry && new Date() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    // 更新访问统计
    entry.accessCount++
    entry.lastAccessed = new Date()

    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // 检查是否过期
    if (entry.expiry && new Date() > entry.expiry) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }

  // 获取缓存统计信息
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalAccess: number
  } {
    let totalAccess = 0
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalAccess > 0 ? (this.cache.size / totalAccess) : 0,
      totalAccess,
    }
  }

  // 批量操作
  mset(entries: Array<{ key: string, data: any, ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl)
    }
  }

  mget<T>(keys: string[]): Array<T | null> {
    return keys.map(key => this.get<T>(key))
  }

  // 基于模式的操作
  deletePattern(pattern: RegExp): number {
    let deleted = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }
    return deleted
  }

  getByPattern<T>(pattern: RegExp): Array<{ key: string, data: T }> {
    const results: Array<{ key: string, data: T }> = []
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key)) {
        // 检查是否过期
        if (!entry.expiry || new Date() <= entry.expiry) {
          entry.accessCount++
          entry.lastAccessed = new Date()
          results.push({ key, data: entry.data })
        }
        else {
          this.cache.delete(key)
        }
      }
    }
    return results
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime()
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup(): void {
    const now = new Date()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key)
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.cache.clear()
  }
}

// 专用缓存管理器
export class ScriptCacheManager extends CacheManager {
  constructor() {
    super({
      maxSize: 500,
      defaultTTL: 60 * 60 * 1000, // 1小时
      cleanupInterval: 10 * 60 * 1000, // 10分钟
    })
  }

  cacheScript(scriptId: string, script: any): void {
    this.set(`script:${scriptId}`, script)
  }

  getScript(scriptId: string): any | null {
    return this.get(`script:${scriptId}`)
  }

  cacheTemplate(templateId: string, template: any): void {
    this.set(`template:${templateId}`, template)
  }

  getTemplate(templateId: string): any | null {
    return this.get(`template:${templateId}`)
  }
}

export class PromptCacheManager extends CacheManager {
  constructor() {
    super({
      maxSize: 200,
      defaultTTL: 2 * 60 * 60 * 1000, // 2小时
      cleanupInterval: 15 * 60 * 1000, // 15分钟
    })
  }

  cachePrompt(promptId: string, prompt: any): void {
    this.set(`prompt:${promptId}`, prompt)
  }

  getPrompt(promptId: string): any | null {
    return this.get(`prompt:${promptId}`)
  }

  cacheAPIDoc(methodId: string, doc: any): void {
    this.set(`api:${methodId}`, doc)
  }

  getAPIDoc(methodId: string): any | null {
    return this.get(`api:${methodId}`)
  }
}

// 导出缓存实例
export const scriptCache = new ScriptCacheManager()
export const promptCache = new PromptCacheManager()
export const generalCache = new CacheManager()
