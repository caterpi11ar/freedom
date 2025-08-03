import type { Game } from '@freedom/core'

export interface Action {
  timeout?: number
  name: string
  callback: (game: Game, actionsReturn: any[]) => Promise<any> | any
}

export interface ScriptOptions {
  name: string
  actions: Action[]
}
