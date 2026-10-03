"use client";

/** GET JSON from an API route and unwrap the { data } / { error } envelope. */
export async function getJson<T = unknown>(
  url: string
): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: json?.error ?? "Something went wrong." };
    }
    return { data: json.data as T };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

/** POST JSON to an API route and unwrap the { data } / { error } envelope. */
export async function postJson<T = unknown>(
  url: string,
  body: unknown
): Promise<{ data: T } | { error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: json?.error ?? "Something went wrong." };
    }
    return { data: json.data as T };
  } catch {
    return { error: "Network error. Please try again." };
  }
}
