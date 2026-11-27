import { ReactNode } from "react";
import { cookies } from "next/headers";
import { FormProvider } from "./context/FormProvider";
import { QueryProvider } from "./providers/QueryProvider";
import AppearanceSync from "./components/AppearanceSync";
import { fontVariables } from "./fonts";
import { APPEARANCE_COOKIE, DEFAULT_APPEARANCE, htmlAttributes, htmlClassName, NO_FLASH_SCRIPT, parseCookie } from "@/lib/appearance";
import "./globals.css";

export const metadata = {
  title: "Get it done",
  icons: "/get-it-done-icon.ico",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // RD-1 no flash: the last appearance chosen on this browser, so the first frame is already right.
  const cookie = parseCookie((await cookies()).get(APPEARANCE_COOKIE)?.value);
  const attrs = htmlAttributes(cookie ?? DEFAULT_APPEARANCE);
  return (
    // suppressHydrationWarning: the inline script may correct data-mode (System) before React hydrates.
    <html lang="en" className={htmlClassName(fontVariables, attrs)} suppressHydrationWarning {...attrs}>
      <head>
        {/* Resolves System from the device before first paint. SEC-10 (CSP) will need a nonce or hash. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <FormProvider>
          <AppearanceSync initialCookie={cookie}>
            <QueryProvider>{children}</QueryProvider>
          </AppearanceSync>
        </FormProvider>
      </body>
    </html>
  );
}
