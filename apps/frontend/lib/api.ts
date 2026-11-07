import type {
  NavigationType,
  PersonDto,
  SearchResultDto,
  SiteDto,
  VisitDto,
} from "@small-web/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3848/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw err;
  }

  if (!res.ok) {
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      details = undefined;
    }
    const message =
      typeof details === "object" &&
      details !== null &&
      "message" in details
        ? Array.isArray((details as { message: unknown }).message)
          ? ((details as { message: string[] }).message).join(", ")
          : String((details as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  getPeople: (init?: RequestInit) => request<PersonDto[]>("/people", init),

  getSite: (address: string, init?: RequestInit) =>
    request<SiteDto>(`/sites/${encodeURIComponent(address)}`, init),

  createSite: (
    body: {
      address: string;
      html: string;
      authorId: string;
      title?: string;
    },
    init?: RequestInit,
  ) =>
    request<SiteDto>("/sites", {
      method: "POST",
      body: JSON.stringify(body),
      ...init,
    }),

  search: (q: string, init?: RequestInit) =>
    request<SearchResultDto[]>(
      `/search?q=${encodeURIComponent(q)}`,
      init,
    ),

  getVisits: (personId: string, init?: RequestInit) =>
    request<VisitDto[]>(
      `/visits?personId=${encodeURIComponent(personId)}`,
      init,
    ),

  createVisit: (
    body: {
      personId: string;
      address: string;
      navigationType: NavigationType;
      status?: "success" | "not-found";
    },
    init?: RequestInit,
  ) =>
    request<VisitDto>("/visits", {
      method: "POST",
      body: JSON.stringify(body),
      ...init,
    }),
};
