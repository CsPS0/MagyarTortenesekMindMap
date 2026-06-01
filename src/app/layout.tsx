import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magyar Történések Mind Map",
  description: "Magyarország legfontosabb politikai és közéleti eseményeinek interaktív térképe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
