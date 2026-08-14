import { ok, handler } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const GET = handler(async () => {
  const user = await getSession();
  return ok({ user });
});
