export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const SESSION_SCOPES = ["WEB", "ADMIN"] as const;
export type SessionScope = (typeof SESSION_SCOPES)[number];

export const RARITIES = ["Umum", "Tidak Umum", "Langka", "Super Langka", "Ultra Langka", "Langka Rahasia"] as const;
export type Rarity = (typeof RARITIES)[number];

export const CARD_TYPES = ["Ninja", "Jutsu", "Misi", "Item", "Pemanggilan", "Dukungan"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const PAGE_SIZE = 20;

export const UPLOAD_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxImagesPerCollectionItem: 8,
  allowed: {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
  } as Record<string, string[]>,
} as const;

export const SESSION_TTL = {
  webDefaultSeconds: 60 * 60 * 24, // 1 day when "remember me" is off
  webRememberSeconds: 60 * 60 * 24 * 30, // 30 days
  adminSeconds: 60 * 60 * 8, // 8 hours
} as const;

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  PUBLISHED: "Dipublikasikan",
  ACTIVE: "Aktif",
  DISABLED: "Nonaktif",
};
