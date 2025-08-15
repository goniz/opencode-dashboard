import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TaskProvider } from "@/contexts/TaskContext";
import { initializeCleanupHandlers } from "@/lib/app-initialization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenCode Dashboard - AI Coding Agent",
  description: "Interactive dashboard for OpenCode CLI - Your AI-powered coding assistant",
};

// Initialize cleanup handlers on server startup
if (typeof window === 'undefined') {
  initializeCleanupHandlers().catch((error) => {
    console.error('[Layout] Failed to initialize cleanup handlers:', error);
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <TaskProvider>
          {children}
        </TaskProvider>
      </body>
    </html>
  );
}
