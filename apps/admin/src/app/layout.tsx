import type { Metadata } from "next";
import { ToastProvider } from "@naruto-ccg/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Naruto CCG Admin", template: "%s · Naruto CCG Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
