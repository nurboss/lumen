import "server-only";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/src/generated/prisma/client";

/** Published, non-deleted batches whose enrollment window has not ended. */
export async function getAvailableBatches(userId?: string, filter?: Prisma.BatchWhereInput) {
  const batches = await prisma.batch.findMany({
    where: {
      AND: [
        {
          deletedAt: null,
          course: { status: "PUBLISHED", deletedAt: null },
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
        filter ?? {},
      ],
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      scheduleDays: true,
      scheduleTime: true,
      seats: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          isFree: true,
          sellPrice: true,
          regularPrice: true,
          category: { select: { name: true } },
        },
      },
      _count: {
        select: { enrollments: { where: { status: { in: ["ACTIVE", "COMPLETED"] } } } },
      },
      enrollments: {
        where: { userId: userId ?? "", status: { in: ["ACTIVE", "COMPLETED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  return batches.map(({ enrollments, ...batch }) => ({ ...batch, enrolled: enrollments.length > 0 }));
}

export type AvailableBatch = Awaited<ReturnType<typeof getAvailableBatches>>[number];
