import { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Get it done",
  icons: "/get-it-done-icon.ico",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
