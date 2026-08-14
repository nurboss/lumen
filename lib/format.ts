/** Format paisa (integer) as a BDT price string. */
export function formatBdt(paisa: number): string {
  const taka = paisa / 100;
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: taka % 1 === 0 ? 0 : 2,
  }).format(taka);
}

/** The effective price of a course in paisa (free / sell / regular). */
export function effectivePrice(course: {
  isFree: boolean;
  sellPrice: number;
  regularPrice: number;
}): number {
  if (course.isFree) return 0;
  return course.sellPrice > 0 ? course.sellPrice : course.regularPrice;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
