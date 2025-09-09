/**
 * 格式化时间间隔为可读的中文字符串
 * @param startTime 开始时间戳（毫秒）
 * @param endTime 结束时间戳（毫秒）
 * @returns 格式化的时间字符串，如 "2分30秒" 或 "45秒"
 */
export function formatDuration(startTime: number, endTime: number): string {
  const duration = Math.round((endTime - startTime) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return minutes > 0
    ? `${minutes}分${seconds}秒`
    : `${seconds}秒`
}

/**
 * 创建时间跟踪器
 * @returns 包含开始时间和格式化函数的对象
 */
export function createTimeTracker() {
  const startTime = Date.now()

  return {
    startTime,
    getFormattedDuration: () => formatDuration(startTime, Date.now()),
  }
}
