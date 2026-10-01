import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "../components/DashboardShell";

export const metadata: Metadata = {
  title: "upay Shield — AI Trust & Fraud Risk Intelligence Platform",
  description: "Enterprise MFS Fraud Operations, Mule Detection & Multi-Channel Interception Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F7F7F7] text-[#212B36] selection:bg-[#FF9F43]/30 selection:text-[#212B36]">
        <DashboardShell>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
