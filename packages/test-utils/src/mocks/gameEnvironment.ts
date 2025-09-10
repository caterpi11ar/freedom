// 游戏环境模拟器 - 参照 Gemini-CLI test-utils 架构
import type { Page } from 'playwright'
import { Buffer } from 'node:buffer'
import { vi } from 'vitest'

export interface MockGameState {
  isConnected: boolean
  currentUrl: string
  region: 'cn' | 'global'
  isLoggedIn: boolean
  currentScene?: string
}

export class MockGameEnvironment {
  private mockState: MockGameState = {
    isConnected: false,
    currentUrl: '',
    region: 'cn',
    isLoggedIn: false,
  }

  async createMockPage(): Promise<Page> {
    const mockPage = {
      goto: vi.fn(async (url: string) => {
        this.mockState.currentUrl = url
        this.mockState.isConnected = true
        return { ok: true, status: 200 }
      }),

      url: vi.fn(() => this.mockState.currentUrl),

      title: vi.fn(async () => 'Mock Game Title'),

      waitForSelector: vi.fn(async (_selector: string) => {
        // Simulate waiting for game elements
        await new Promise(resolve => setTimeout(resolve, 100))
        return { isVisible: () => true }
      }),

      click: vi.fn(async (_selector: string) => {
        // Simulate game interactions
        await new Promise(resolve => setTimeout(resolve, 50))
      }),

      screenshot: vi.fn(async (_options?: any) => {
        return Buffer.from('mock-screenshot-data')
      }),

      evaluate: vi.fn(async (fn: () => void) => {
        // Simulate JavaScript execution in game context
        return fn()
      }),

      close: vi.fn(async () => {
        this.mockState.isConnected = false
      }),
    } as unknown as Page

    return mockPage
  }

  async simulateGameAction(action: string): Promise<void> {
    switch (action) {
      case 'login':
        await new Promise(resolve => setTimeout(resolve, 200))
        this.mockState.isLoggedIn = true
        break

      case 'logout':
        this.mockState.isLoggedIn = false
        break

      case 'navigate_to_game':
        this.mockState.currentScene = 'game'
        break

      case 'disconnect':
        this.mockState.isConnected = false
        break

      default:
        throw new Error(`Unknown game action: ${action}`)
    }
  }

  getGameState(): MockGameState {
    return { ...this.mockState }
  }

  resetGameState(): void {
    this.mockState = {
      isConnected: false,
      currentUrl: '',
      region: 'cn',
      isLoggedIn: false,
    }
  }

  // Simulate game element queries
  async mockGameElementExists(selector: string): Promise<boolean> {
    const commonSelectors = [
      '.game-canvas',
      '#login-form',
      '.character-panel',
      '.inventory-button',
      '.daily-missions',
    ]

    return commonSelectors.includes(selector)
  }

  // Simulate game state changes
  async mockGameStateChange(newState: Partial<MockGameState>): Promise<void> {
    this.mockState = { ...this.mockState, ...newState }

    // Simulate async state propagation
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
