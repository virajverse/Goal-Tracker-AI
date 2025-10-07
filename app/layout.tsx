import React from "react";
import "./globals.css";
import Providers from "./providers";
import Layout from "@/react-app/components/Layout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-[100svh] h-full overflow-x-hidden bg-purple-950 text-white antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
