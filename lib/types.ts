export type Role = "student" | "editor" | "admin";
export type PostType = "article" | "idea" | "dataset" | "protocol" | "audio";
export type Status = "draft" | "pending" | "published";
export interface Profile { id: string; username?: string; full_name: string | null; role: Role; trusted?: boolean | null; created_at?: string; avatar_url?: string | null; headline?: string | null; bio?: string | null; website?: string | null; suspended_until?: string | null; suspension_reason?: string | null }
export interface Post {
  id: string; author_id: string; title: string; post_type: PostType; category: string;
  content: string; metadata: Record<string, unknown>; status: Status; created_at: string; tags?: string[] | null; review_note?: string | null;
  profiles?: { username?: string; full_name: string | null; avatar_url?: string | null } | null;
}
export const CATEGORIES = ["CRISPR", "Genetics", "Synthetic Bio", "Proteomics", "Bioinformatics"] as const;
