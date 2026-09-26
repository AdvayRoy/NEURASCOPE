/**
 * Wire types for the Oriane Integration Connect API.
 * Transcribed from docs/oriane/openapi.snapshot.json (https://connect.oriane.xyz/rest/docs).
 * Downstream code must not import these; use the normalized ontology in src/lib/ontology.ts.
 */

export type OrianePlatform = "instagram" | "tiktok";
export type OrianeFormat = "image" | "video" | "carousel";
export type OrianeProjection = "basic" | "default" | "full";

export interface OrianeIncludes<T> {
  includes?: T[];
  excludes?: T[];
  operator?: "and" | "or";
}

export interface OrianePlatformIdRef {
  platform: OrianePlatform;
  platformId: string;
}

export interface OrianeVisualSimilarityValue {
  assetId: string;
  minScore?: number;
  maxScore?: number;
}

export interface OrianeContentFilters {
  id?: OrianeIncludes<string>;
  platform?: OrianeIncludes<OrianePlatform>;
  platformId?: OrianeIncludes<OrianePlatformIdRef>;
  format?: OrianeIncludes<OrianeFormat>;
  profileHandle?: OrianeIncludes<string>;
  hashtags?: OrianeIncludes<string>;
  transcript?: {
    exactMatch?: { values: string[]; operator?: "and" | "or" };
    includesExactly?: { values: string[]; operator?: "and" | "or" };
  };
  visualSimilarity?: {
    includes?: { values: OrianeVisualSimilarityValue[]; operator?: "and" | "or" };
  };
}

export interface OrianeContentQuery {
  name?: string;
  operator: "and" | "or";
  filters?: OrianeContentFilters;
  queries?: OrianeContentQuery[];
}

export type OrianeSortField =
  | "visualSimilarity"
  | "transcriptRelevance"
  | "viewsCount"
  | "likesCount"
  | "sharesCount"
  | "commentsCount"
  | "interactionsCount"
  | "engagementRatePerViews"
  | "engagementRatePerFollowers"
  | "profileFollowersCount"
  | "publishedAt";

export interface OrianeSearchParams {
  sort?: string;
  offset?: number;
  limit?: number;
  projection?: OrianeProjection;
  aiSearchAnchor?: string;
}

export interface OrianeTranscriptChunk {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface OrianeFrame {
  id: string;
  position: number;
  timestampSeconds: number;
  visualSimilarityScore?: number;
  url: string;
}

export interface OrianeHandleRef {
  id: string | null;
  platformId: string | null;
  profileHandle: string;
}

export interface OrianePopularComment {
  platformId: string;
  profilePlatformId: string | null;
  profileHandle: string | null;
  content: string;
  likesCount: number;
  repliesCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrianeContentFull {
  id: string;
  matchedQueries: string[];
  platform: OrianePlatform;
  profileHandle: string;
  profileDisplayName: string | null;
  format: OrianeFormat | null;
  caption: string | null;
  captionLanguage: string | null;
  thumbnailMediaId: string | null;
  publishedAt: string;
  profileId: string | null;
  thumbnailMediaUrl: string | null;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  interactionsCount: number;
  engagementRatePerViews: number | null;
  engagementRatePerFollowers: number | null;
  profileFollowersCount: number;
  profileFollowingCount: number;
  profilePostsCount: number;
  mediaCount: number;
  duration: number | null;
  hashtags: string[];
  coAuthors: OrianeHandleRef[];
  mentions: OrianeHandleRef[];
  platformId: string;
  profilePlatformId: string;
  profilePictureUrl: string;
  profileBio: string | null;
  profileVerified: boolean;
  transcript: string | null;
  transcriptLanguage: string | null;
  transcriptChunks: OrianeTranscriptChunk[] | null;
  frames: OrianeFrame[] | null;
  audioPlatformId: string | null;
  audioTitle: string | null;
  audioAuthor: string | null;
  audioType: string | null;
  audioCopyrighted: boolean | null;
  popularComments: OrianePopularComment[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OrianePagination {
  offset: number;
  limit: number;
  totalCount: number;
  aiSearchAnchor?: string;
}

export interface OrianeMetadata {
  requestId: string;
  executionTime: number;
  timestamp: number;
  pagination?: OrianePagination;
}

export interface OrianeSearchContentsResponse {
  metadata: OrianeMetadata;
  data: { results: OrianeContentFull[]; aggregations?: unknown };
}

export type OrianeCreateAssetRequest =
  | { type: "text"; text: string }
  | { type: "image"; image: { type: "url"; url: string } | { type: "base64"; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string } };

export interface OrianeCreateAssetResponse {
  metadata: OrianeMetadata;
  data: { id: string };
}

export interface OrianeErrorBody {
  metadata?: OrianeMetadata;
  error: { id?: string; operation: string; code: string; message: string };
}
