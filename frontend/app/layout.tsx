import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "DocFlow AI",
  description: "AI Document Assistant",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
