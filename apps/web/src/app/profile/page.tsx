import type { Metadata } from "next";
import Link from "next/link";
import { getUserById } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { LoginPrompt } from "@/components/login-prompt";
import { AvatarEditor, ProfileForm } from "@/components/profile-forms";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).profile.title };
}

export default async function ProfilePage() {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  const t = dict.profile;
  if (!user) return <LoginPrompt title={t.title} next="/profile" />;
  const counts = (await getUserById(user.id))?._count;

  return (
    <>
      <h1 className="mb-6 page-title text-4xl">{t.title}</h1>
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <section className="glass p-6">
          <h2 className="sr-only">{t.photo}</h2>
          <AvatarEditor name={user.username} avatarUrl={imageUrl(user.avatarKey)} />
          <div className="mt-6 border-t border-line pt-4 text-center">
            <p className="font-semibold">{user.username}</p>
            <p className="text-sm text-muted">{t.memberSince(formatDate(user.createdAt, dict.intl))}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
            <Link href="/wishlist" className="rounded-xl bg-panel p-3 transition hover:bg-brand-500/20">
              <span className="block text-xs text-muted">{dict.nav.wishlist}</span>
              <span className="font-semibold">{t.wishlistCount(counts?.wishlistItems ?? 0)}</span>
            </Link>
            <Link href="/collection" className="rounded-xl bg-panel p-3 transition hover:bg-brand-500/20">
              <span className="block text-xs text-muted">{dict.nav.collection}</span>
              <span className="font-semibold">{t.collectionCount(counts?.collectionItems ?? 0)}</span>
            </Link>
          </div>
        </section>
        <section className="glass p-6">
          <h2 className="mb-4 border-b-[3px] border-brand-500 pb-2 page-title text-2xl">{t.details}</h2>
          <ProfileForm name={user.username} email={user.email} />
        </section>
      </div>
    </>
  );
}
