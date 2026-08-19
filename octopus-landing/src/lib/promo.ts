export function isPromoActive(now: Date, deadline: string): boolean {
  return now <= new Date(`${deadline}T23:59:59+03:00`);
}
