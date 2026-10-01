import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "upay Shield — AI Trust, Scam-Interception & Mule-Network Intelligence",
  description: "Stops scams before money leaves, uncovers mule rings, and empowers analysts with grounded investigation briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#060d1f] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
