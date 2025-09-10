// 登录相关类型定义

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginConfig {
  gameUrl: string
  canvasSelector: string
  coordinates: {
    usernameInput: { x: number, y: number }
    passwordInput: { x: number, y: number }
    loginButton: { x: number, y: number }
    serverSelect?: { x: number, y: number }
    confirmButton?: { x: number, y: number }
  }
  timeouts: {
    pageLoad: number
    canvasReady: number
    loginResponse: number
    serverSelect: number
  }
}

export enum LoginState {
  INITIAL = 'initial',
  LOADING_PAGE = 'loading_page',
  CANVAS_LOADING = 'canvas_loading',
  LOGIN_SCREEN = 'login_screen',
  ENTERING_CREDENTIALS = 'entering_credentials',
  LOGGING_IN = 'logging_in',
  SERVER_SELECT = 'server_select',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  NEED_VERIFICATION = 'need_verification',
  UNKNOWN = 'unknown',
}

export interface LoginStatus {
  state: LoginState
  message: string
  timestamp: number
  success: boolean
  error?: string
}

export interface LoginResult {
  success: boolean
  state: LoginState
  message: string
  duration: number
  error?: Error
}

export interface LoginDetectionSettings {
  // 用于检测登录界面的颜色和位置
  loginScreenDetection: {
    // 检测点的坐标和期望颜色
    checkPoints: Array<{
      x: number
      y: number
      expectedColor: { r: number, g: number, b: number }
      tolerance: number // 颜色容差
    }>
  }

  // 用于检测加载状态
  loadingDetection: {
    checkPoints: Array<{
      x: number
      y: number
      expectedColor: { r: number, g: number, b: number }
      tolerance: number
    }>
  }
}

// 默认配置 (针对原神云游戏)
export const DEFAULT_LOGIN_CONFIG: LoginConfig = {
  gameUrl: 'https://ys.mihoyo.com/cloud/',
  canvasSelector: 'canvas',
  coordinates: {
    // 这些坐标需要根据实际游戏界面调整
    usernameInput: { x: 960, y: 400 }, // 屏幕中心偏上
    passwordInput: { x: 960, y: 450 }, // 用户名下方
    loginButton: { x: 960, y: 500 }, // 密码下方
    serverSelect: { x: 960, y: 300 }, // 服务器选择
    confirmButton: { x: 960, y: 550 }, // 确认按钮
  },
  timeouts: {
    pageLoad: 30000, // 页面加载超时
    canvasReady: 15000, // Canvas准备超时
    loginResponse: 10000, // 登录响应超时
    serverSelect: 5000, // 服务器选择超时
  },
}

export const DEFAULT_DETECTION_SETTINGS: LoginDetectionSettings = {
  loginScreenDetection: {
    checkPoints: [
      // 检测登录按钮区域的颜色 (需要根据实际调整)
      { x: 960, y: 500, expectedColor: { r: 255, g: 165, b: 0 }, tolerance: 30 },
      // 检测输入框区域
      { x: 960, y: 400, expectedColor: { r: 255, g: 255, b: 255 }, tolerance: 50 },
    ],
  },
  loadingDetection: {
    checkPoints: [
      // 检测加载动画区域 (通常是旋转的图标)
      { x: 960, y: 540, expectedColor: { r: 200, g: 200, b: 200 }, tolerance: 50 },
    ],
  },
}
