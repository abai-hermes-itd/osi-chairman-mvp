// Только для браузера: сжатие фото перед отправкой (лимит тела запроса на Vercel ~4,5 МБ).
// Перекодирование через canvas заодно удаляет метаданные EXIF (в том числе геолокацию).
export async function shrinkImage(file: File, maxSide = 1280, quality = 0.75): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Не удалось обработать фото")
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))
  if (!blob) throw new Error("Не удалось сжать фото")
  return new File([blob], "photo.jpg", { type: "image/jpeg" })
}
