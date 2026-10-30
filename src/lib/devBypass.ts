// Отключение входа ТОЛЬКО для локальной разработки (next dev) и только по явному флагу.
// В production-сборке (Vercel, next start) NODE_ENV === "production", поэтому флаг игнорируется,
// даже если DEV_AUTH_BYPASS=1 по ошибке попал в переменные окружения.
export function devBypass(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "1"
}
