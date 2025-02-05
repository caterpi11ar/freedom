import type { Browser, Cookie, Page } from 'puppeteer'
import { launch } from 'puppeteer'

export interface Game extends Page {}

class App {
  public browser?: Browser
  readonly url = 'https://ys.mihoyo.com/cloud/#/'

  constructor() {}

  async launch(options?: Parameters<typeof launch>[0]) {
    const browser = await launch(options)
    this.browser = browser
  }

  async close() {
    await this.browser?.close()
  }

  async new(cookies?: Cookie[]): Promise<Game> {
    if (!this.browser)
      throw new Error('you must use app.launch before')
    const context = await this.browser.createBrowserContext()

    if (cookies)
      await context.setCookie(...cookies)

    const page = await context.newPage()
    await page.goto(this.url)
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' })

    return page
  }
}

export default App
