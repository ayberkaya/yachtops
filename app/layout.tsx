import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "YachtOps - Yacht Operations Management",
  description: "Complete yacht operations management system",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
