"use server";

import { revalidatePath } from "next/cache";
import { getStorage, saveImage, UploadError } from "@naruto-ccg/storage";
import { guard, setUserAvatar, updateProfile } from "@naruto-ccg/database";
import { failure, fieldErrors, profileSchema, success, type ActionState } from "@naruto-ccg/shared";
import { requireUser } from "../auth";
import { localizeState, translateMessage } from "../i18n/messages";
import { getDictionary, getLocale } from "../i18n/server";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const refresh = () => revalidatePath("/", "layout");

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const parsed = profileSchema.safeParse({ username: str(fd, "username") });
  if (!parsed.success) return localizeState(failure(t.auth.fixFields, fieldErrors(parsed.error)), locale);
  const result = await guard(async () => {
    await updateProfile(user.id, parsed.data);
    refresh();
    return success(t.profile.saved);
  });
  return localizeState(result, locale);
}

export async function uploadAvatarAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0) return failure(t.profile.pickPhoto);

  const result = await guard(async () => {
    let key: string | null = null;
    try {
      key = await saveImage(`avatars/${user.id}`, file);
      const { previousKey } = await setUserAvatar(user.id, key);
      if (previousKey) await getStorage().delete(previousKey).catch(() => undefined);
    } catch (e) {
      if (key) await getStorage().delete(key).catch(() => undefined);
      if (e instanceof UploadError) return failure(translateMessage(e.message, locale));
      throw e;
    }
    refresh();
    return success(t.profile.photoUpdated);
  });
  return localizeState(result, locale);
}

export async function removeAvatarAction(): Promise<ActionState> {
  const user = await requireUser();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const result = await guard(async () => {
    const { previousKey } = await setUserAvatar(user.id, null);
    if (previousKey) await getStorage().delete(previousKey).catch(() => undefined);
    refresh();
    return success(t.profile.photoRemoved);
  });
  return localizeState(result, locale);
}
