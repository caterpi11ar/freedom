export interface LoginCredentials {
  username: string
  password: string
}
export interface LoginConfig {
  gameUrl: string
  canvasSelector: string
  coordinates: {
    usernameInput: {
      x: number
      y: number
    }
    passwordInput: {
      x: number
      y: number
    }
    loginButton: {
      x: number
      y: number
    }
    serverSelect?: {
      x: number
      y: number
    }
    confirmButton?: {
      x: number
      y: number
    }
  }
  timeouts: {
    pageLoad: number
    canvasReady: number
    loginResponse: number
    serverSelect: number
  }
}
export declare enum LoginState {
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
  loginScreenDetection: {
    checkPoints: Array<{
      x: number
      y: number
      expectedColor: {
        r: number
        g: number
        b: number
      }
      tolerance: number
    }>
  }
  loadingDetection: {
    checkPoints: Array<{
      x: number
      y: number
      expectedColor: {
        r: number
        g: number
        b: number
      }
      tolerance: number
    }>
  }
}
export declare const DEFAULT_LOGIN_CONFIG: LoginConfig
export declare const DEFAULT_DETECTION_SETTINGS: LoginDetectionSettings
// # sourceMappingURL=LoginTypes.d.ts.map
