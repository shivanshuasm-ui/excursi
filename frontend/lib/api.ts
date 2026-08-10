import type {
  Category,
  ExperienceDetail,
  ExperienceFilters,
  ExperienceListResponse,
} from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api";

/** Experience detail pages use ISR; lists revalidate more frequently. */
const REVALIDATE_LIST = 60;
const REVALIDATE_DETAIL = 120;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

function toQuery(filters: ExperienceFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function listExperiences(
  filters: ExperienceFilters = {},
): Promise<ExperienceListResponse> {
  return get<ExperienceListResponse>(
    `/experiences${toQuery(filters)}`,
    REVALIDATE_LIST,
  );
}

/** Returns null on 404 so the page can render notFound(). */
export async function getExperience(
  slug: string,
): Promise<ExperienceDetail | null> {
  try {
    const { experience } = await get<{ experience: ExperienceDetail }>(
      `/experiences/${encodeURIComponent(slug)}`,
      REVALIDATE_DETAIL,
    );
    return experience;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function listCategories(): Promise<Category[]> {
  const { categories } = await get<{ categories: Category[] }>(
    `/categories`,
    REVALIDATE_LIST,
  );
  return categories;
}

/** Format a money amount for display. */
export function formatPrice(
  amount: number | string | null,
  currency = "INR",
): string {
  if (amount === null) return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}
