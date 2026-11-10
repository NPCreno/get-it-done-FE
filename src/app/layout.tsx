import { ReactNode } from "react";
import { FormProvider } from "./context/FormProvider";
import { QueryProvider } from "./providers/QueryProvider";
import "./globals.css";

export const metadata = {
  title: "Get it done",
  icons: "/get-it-done-icon.ico",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FormProvider>
          <QueryProvider>{children}</QueryProvider>
        </FormProvider>
      </body>
    </html>
  );
}
