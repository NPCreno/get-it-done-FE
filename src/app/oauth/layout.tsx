import type { ReactNode } from "react";

export const metadata = {
  title: "Connect an app | Get it done",
  // A one-time page with request parameters: never index it.
  robots: { index: false, follow: false },
};

export default function OAuthLayout({ children }: { children: ReactNode }) {
  return children;
}
