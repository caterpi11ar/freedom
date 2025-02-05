export type Game = import('@freedom/core').Game

export interface Action {
  timeout?: number
  name: string
  callback: (game: Game, actionsReturn: any[]) => Promise<any> | any
}

interface ScriptOptions {
  name: string
  actions: Action[]
}

class Executor {
  public name?: string
  public actions: Action[]
  private game: Game

  constructor(game: Game, options: ScriptOptions) {
    this.game = game
    const { name, actions } = options
    this.name = name
    this.actions = actions
  }

  async execute() {
    const actionsReturn: any[] = []
    console.log(`Executing script: ${this.name}`)
    for (const index in this.actions) {
      const action = this.actions[index]
      console.log(`Action "${action.name}" started`)

      try {
        actionsReturn[index] = await action.callback(this.game, actionsReturn)
        console.log(`Action "${action.name}" completed`)
      }
      catch (error) {
        console.error(`Action "${action.name}" failed:`, error)
      }
    }
  }
}

export default Executor
