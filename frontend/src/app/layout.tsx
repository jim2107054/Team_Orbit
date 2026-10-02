import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "../components/DashboardShell";
import { ThemeProvider } from "../components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('upay-theme');
                if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen bg-slate-50 dark:bg-[#070E18] text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200">
        <ThemeProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
