import { NextResponse } from "next/server"
import path from "path"
import matter from "gray-matter"

export const dynamic = "force-dynamic"

// Читает паспорт МКД из data/config/house.md (frontmatter)
export async function GET() {
  try {
    const file = matter.read(path.join(process.cwd(), "data/config/house.md"))
    return NextResponse.json(file.data)
  } catch (error) {
    console.error("Не удалось прочитать house.md:", error)
    return NextResponse.json({ error: "Паспорт МКД не найден" }, { status: 404 })
  }
}
