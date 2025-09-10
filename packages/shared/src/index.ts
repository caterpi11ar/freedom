// Shared utilities and types for Freedom project

// State management types and utilities
export interface GlobalState {
  isRunning: boolean
  sessionId?: string
  lastActivity?: Date
}

export class StateManager {
  private state: GlobalState = {
    isRunning: false,
  }

  getState(): GlobalState {
    return { ...this.state }
  }

  setState(updates: Partial<GlobalState>): void {
    this.state = { ...this.state, ...updates }
  }
}

export const globalStateManager = new StateManager()

// Configuration types
export * from './types/config.js'
