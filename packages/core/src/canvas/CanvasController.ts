// Canvas控制器 - Web端云游戏的核心交互控制
import type { Buffer } from 'node:buffer'

import type { ElementHandle, Page } from 'playwright'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasInfo {
  element: ElementHandle<Element>
  bounds: BoundingBox
  scale: { x: number, y: number }
  offset: { x: number, y: number }
  resolution: { width: number, height: number }
}

export interface GameCoordinate {
  x: number
  y: number
  relative?: boolean // 是否为相对坐标 (0-1范围)
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle'
  delay?: number
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[]
}

export interface DragOptions {
  steps?: number // 拖拽步数，影响拖拽速度
  delay?: number // 每步之间的延迟
}

export interface ScreenshotArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Canvas控制器类 - 专门用于Web端云游戏的Canvas交互
 *
 * 功能包括：
 * - Canvas元素定位和信息获取
 * - 坐标系转换 (游戏坐标 ↔ 屏幕坐标)
 * - Canvas区域截图
 * - 鼠标交互模拟 (点击、拖拽、滚动)
 * - 颜色采样
 */
export class CanvasController {
  private page: Page
  private canvas: CanvasInfo | null = null
  private canvasSelector: string
  private initialized = false

  constructor(page: Page, canvasSelector: string = 'canvas') {
    this.page = page
    this.canvasSelector = canvasSelector
  }

  /**
   * 初始化Canvas控制器
   * 查找Canvas元素并获取其基本信息
   */
  async initialize(): Promise<void> {
    try {
      const canvasElement = await this.page.waitForSelector(this.canvasSelector, {
        timeout: 10000,
        state: 'attached',
      })

      if (!canvasElement) {
        throw new Error(`Canvas element not found with selector: ${this.canvasSelector}`)
      }

      const bounds = await canvasElement.boundingBox()
      if (!bounds) {
        throw new Error('Unable to get canvas bounding box')
      }

      // 获取Canvas的实际尺寸
      const canvasSize = await canvasElement.evaluate((canvas: HTMLCanvasElement) => ({
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
      }))

      this.canvas = {
        element: canvasElement,
        bounds,
        scale: {
          x: canvasSize.width / bounds.width,
          y: canvasSize.height / bounds.height,
        },
        offset: {
          x: bounds.x,
          y: bounds.y,
        },
        resolution: {
          width: canvasSize.width,
          height: canvasSize.height,
        },
      }

      this.initialized = true
    }
    catch (error) {
      throw new Error(`Failed to initialize CanvasController: ${error}`)
    }
  }

  /**
   * 获取Canvas信息
   */
  async getCanvasInfo(): Promise<CanvasInfo> {
    if (!this.initialized || !this.canvas) {
      await this.initialize()
    }
    return this.canvas!
  }

  /**
   * 坐标转换：游戏坐标 → 屏幕坐标
   * @param coord 游戏坐标
   * @returns 屏幕坐标
   */
  async gameToScreen(coord: GameCoordinate): Promise<{ x: number, y: number }> {
    const canvas = await this.getCanvasInfo()

    let gameX = coord.x
    let gameY = coord.y

    // 如果是相对坐标，转换为绝对坐标
    if (coord.relative) {
      gameX = coord.x * canvas.resolution.width
      gameY = coord.y * canvas.resolution.height
    }

    // 转换为屏幕坐标
    const screenX = canvas.offset.x + (gameX / canvas.scale.x)
    const screenY = canvas.offset.y + (gameY / canvas.scale.y)

    return { x: screenX, y: screenY }
  }

  /**
   * 坐标转换：屏幕坐标 → 游戏坐标
   * @param screenX 屏幕X坐标
   * @param screenY 屏幕Y坐标
   * @returns 游戏坐标
   */
  async screenToGame(screenX: number, screenY: number): Promise<GameCoordinate> {
    const canvas = await this.getCanvasInfo()

    const gameX = (screenX - canvas.offset.x) * canvas.scale.x
    const gameY = (screenY - canvas.offset.y) * canvas.scale.y

    return { x: gameX, y: gameY }
  }

  /**
   * 点击Canvas指定位置
   * @param coord 游戏坐标
   * @param options 点击选项
   */
  async clickAt(coord: GameCoordinate, options: ClickOptions = {}): Promise<void> {
    const screenCoord = await this.gameToScreen(coord)

    await this.page.mouse.click(screenCoord.x, screenCoord.y, {
      button: options.button || 'left',
      delay: options.delay || 100,
    })

    // 等待一小段时间确保操作被处理
    await this.page.waitForTimeout(50)
  }

  /**
   * 双击Canvas指定位置
   * @param coord 游戏坐标
   * @param options 点击选项
   */
  async doubleClickAt(coord: GameCoordinate, options: ClickOptions = {}): Promise<void> {
    const screenCoord = await this.gameToScreen(coord)

    await this.page.mouse.dblclick(screenCoord.x, screenCoord.y, {
      button: options.button || 'left',
      delay: options.delay || 100,
    })

    await this.page.waitForTimeout(50)
  }

  /**
   * 拖拽操作
   * @param from 起始游戏坐标
   * @param to 目标游戏坐标
   * @param options 拖拽选项
   */
  async dragTo(from: GameCoordinate, to: GameCoordinate, options: DragOptions = {}): Promise<void> {
    const fromScreen = await this.gameToScreen(from)
    const toScreen = await this.gameToScreen(to)

    const steps = options.steps || 10
    const delay = options.delay || 50

    // 移动到起始位置
    await this.page.mouse.move(fromScreen.x, fromScreen.y)
    await this.page.waitForTimeout(100)

    // 按下鼠标
    await this.page.mouse.down()
    await this.page.waitForTimeout(100)

    // 分步拖拽到目标位置
    const deltaX = (toScreen.x - fromScreen.x) / steps
    const deltaY = (toScreen.y - fromScreen.y) / steps

    for (let i = 1; i <= steps; i++) {
      const currentX = fromScreen.x + (deltaX * i)
      const currentY = fromScreen.y + (deltaY * i)

      await this.page.mouse.move(currentX, currentY)

      if (delay > 0) {
        await this.page.waitForTimeout(delay)
      }
    }

    // 释放鼠标
    await this.page.mouse.up()
    await this.page.waitForTimeout(100)
  }

  /**
   * 鼠标悬停
   * @param coord 游戏坐标
   */
  async hoverAt(coord: GameCoordinate): Promise<void> {
    const screenCoord = await this.gameToScreen(coord)
    await this.page.mouse.move(screenCoord.x, screenCoord.y)
    await this.page.waitForTimeout(100)
  }

  /**
   * 鼠标滚轮操作
   * @param coord 游戏坐标
   * @param deltaY 滚动量
   */
  async scrollAt(coord: GameCoordinate, deltaY: number): Promise<void> {
    const screenCoord = await this.gameToScreen(coord)

    // 先移动到指定位置
    await this.page.mouse.move(screenCoord.x, screenCoord.y)
    await this.page.waitForTimeout(50)

    // 执行滚轮操作
    await this.page.mouse.wheel(0, deltaY)
    await this.page.waitForTimeout(100)
  }

  /**
   * 获取Canvas截图
   * @param area 截图区域 (可选，游戏坐标系)
   * @returns 截图Buffer
   */
  async screenshot(area?: ScreenshotArea): Promise<Buffer> {
    const canvas = await this.getCanvasInfo()

    let clip: BoundingBox | undefined

    if (area) {
      // 转换游戏坐标到屏幕坐标
      const topLeft = await this.gameToScreen({ x: area.x, y: area.y })
      const bottomRight = await this.gameToScreen({
        x: area.x + area.width,
        y: area.y + area.height,
      })

      clip = {
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      }
    }
    else {
      // 截取整个Canvas
      clip = canvas.bounds
    }

    return await this.page.screenshot({
      clip,
      type: 'png',
    })
  }

  /**
   * 颜色采样 - 获取指定位置的颜色
   * @param coord 游戏坐标
   * @returns RGBA颜色值
   */
  async sampleColor(coord: GameCoordinate): Promise<{ r: number, g: number, b: number, a: number }> {
    const canvas = await this.getCanvasInfo()

    // 在页面上下文中获取Canvas像素数据
    const color = await this.page.evaluate(async ({ canvasSelector, x, y }) => {
      const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement
      if (!canvas) {
        throw new Error('Canvas not found')
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Cannot get canvas context')
      }

      const imageData = ctx.getImageData(x, y, 1, 1)
      const pixel = imageData.data

      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        a: pixel[3] / 255, // 转换为0-1范围
      }
    }, {
      canvasSelector: this.canvasSelector,
      x: coord.relative ? coord.x * canvas.resolution.width : coord.x,
      y: coord.relative ? coord.y * canvas.resolution.height : coord.y,
    })

    return color
  }

  /**
   * 检查Canvas是否可用
   */
  async isCanvasReady(): Promise<boolean> {
    try {
      if (!this.canvas) {
        return false
      }

      return await this.canvas.element.evaluate((canvas: HTMLCanvasElement) => {
        return canvas.width > 0 && canvas.height > 0
      })
    }
    catch {
      return false
    }
  }

  /**
   * 等待Canvas准备就绪
   * @param timeout 超时时间
   */
  async waitForCanvasReady(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      if (await this.isCanvasReady()) {
        return true
      }
      await this.page.waitForTimeout(100)
    }

    return false
  }

  /**
   * 获取Canvas的实际渲染尺寸
   */
  async getCanvasResolution(): Promise<{ width: number, height: number }> {
    const canvas = await this.getCanvasInfo()
    return canvas.resolution
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    if (this.canvas?.element) {
      await this.canvas.element.dispose()
    }
    this.canvas = null
    this.initialized = false
  }
}
