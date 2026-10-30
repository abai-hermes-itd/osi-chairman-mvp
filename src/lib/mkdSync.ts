import fs from 'fs';
// @ts-ignore
import matter from 'gray-matter';
import { prisma } from './prisma';

export async function updateMkdConfig(newData: any) {
  const path = 'data/config/house.md';
  
  // 1. Обновляем Markdown (Источник правды)
  const file = matter.read(path);
  const updatedData = { ...file.data, ...newData, status: "CONFIGURED" };
  fs.writeFileSync(path, matter.stringify(file.content, updatedData));

  // 2. Обновляем Neon (Инструмент для аналитики и UI)
  // Поля house.md в snake_case, в Prisma — camelCase
  const osiData = {
    bin: newData.bin || "temp",
    name: newData.name,
    managementType: newData.management_type,
    city: newData.city,
    address: newData.address,
    totalFlats: newData.total_flats,
    status: "CONFIGURED",
  };

  return await prisma.osi.upsert({
    where: { bin: osiData.bin },
    update: osiData,
    create: osiData,
  });
}