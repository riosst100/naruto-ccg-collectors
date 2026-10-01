import { storageUrl } from "@naruto-ccg/storage";

// The admin app lives under basePath /admin, so plain <img> URLs need the prefix.
export const imageUrl = (key: string | null | undefined) => storageUrl(key, "/admin/uploads");
