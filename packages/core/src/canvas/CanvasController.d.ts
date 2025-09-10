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
  scale: {
    x: number
    y: number
  }
  offset: {
    x: number
    y: number
  }
  resolution: {
    width: number
    height: number
  }
}
export interface GameCoordinate {
  x: number
  y: number
  relative?: boolean
}
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle'
  delay?: number
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[]
}
export interface DragOptions {
  steps?: number
  delay?: number
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
export declare class CanvasController {
  private page
  private canvas
  private canvasSelector
  private initialized
  constructor(page: Page, canvasSelector?: string)
  /**
   * 初始化Canvas控制器
   * 查找Canvas元素并获取其基本信息
   */
  initialize(): Promise<void>
  /**
   * 获取Canvas信息
   */
  getCanvasInfo(): Promise<CanvasInfo>
  /**
   * 坐标转换：游戏坐标 → 屏幕坐标
   * @param coord 游戏坐标
   * @returns 屏幕坐标
   */
  gameToScreen(coord: GameCoordinate): Promise<{
    x: number
    y: number
  }>
  /**
   * 坐标转换：屏幕坐标 → 游戏坐标
   * @param screenX 屏幕X坐标
   * @param screenY 屏幕Y坐标
   * @returns 游戏坐标
   */
  screenToGame(screenX: number, screenY: number): Promise<GameCoordinate>
  /**
   * 点击Canvas指定位置
   * @param coord 游戏坐标
   * @param options 点击选项
   */
  clickAt(coord: GameCoordinate, options?: ClickOptions): Promise<void>
  /**
   * 双击Canvas指定位置
   * @param coord 游戏坐标
   * @param options 点击选项
   */
  doubleClickAt(coord: GameCoordinate, options?: ClickOptions): Promise<void>
  /**
   * 拖拽操作
   * @param from 起始游戏坐标
   * @param to 目标游戏坐标
   * @param options 拖拽选项
   */
  dragTo(from: GameCoordinate, to: GameCoordinate, options?: DragOptions): Promise<void>
  /**
   * 鼠标悬停
   * @param coord 游戏坐标
   */
  hoverAt(coord: GameCoordinate): Promise<void>
  /**
   * 鼠标滚轮操作
   * @param coord 游戏坐标
   * @param deltaY 滚动量
   */
  scrollAt(coord: GameCoordinate, deltaY: number): Promise<void>
  /**
   * 获取Canvas截图
   * @param area 截图区域 (可选，游戏坐标系)
   * @returns 截图Buffer
   */
  screenshot(area?: ScreenshotArea): Promise<Buffer>
  /**
   * 颜色采样 - 获取指定位置的颜色
   * @param coord 游戏坐标
   * @returns RGBA颜色值
   */
  sampleColor(coord: GameCoordinate): Promise<{
    r: number
    g: number
    b: number
    a: number
  }>
  /**
   * 检查Canvas是否可用
   */
  isCanvasReady(): Promise<boolean>
  /**
   * 等待Canvas准备就绪
   * @param timeout 超时时间
   */
  waitForCanvasReady(timeout?: number): Promise<boolean>
  /**
   * 获取Canvas的实际渲染尺寸
   */
  getCanvasResolution(): Promise<{
    width: number
    height: number
  }>
  /**
   * 清理资源
   */
  dispose(): Promise<void>
}
export {}
// # sourceMappingURL=CanvasController.d.ts.map
