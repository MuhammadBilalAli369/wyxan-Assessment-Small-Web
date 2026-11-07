export type NavigationType =
  | "address-bar"
  | "link"
  | "back"
  | "forward"
  | "history-jump"
  | "search"
  | "publish-open";

export type VisitStatus = "success" | "not-found";

export interface PersonDto {
  id: string;
  name: string;
}

export interface SiteDto {
  id: string;
  address: string;
  title: string;
  html: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitDto {
  id: string;
  personId: string;
  address: string;
  timestamp: string;
  navigationType: NavigationType;
  status: VisitStatus;
  siteId?: string | null;
  title?: string | null;
}

export interface SearchResultDto {
  id: string;
  address: string;
  title: string;
  excerpt: string;
}
