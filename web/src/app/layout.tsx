import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SpeechApp — Speech & Text",
  description: "Speech to Text and Text to Speech web application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Sidebar />
          <main className="min-h-screen transition-all duration-300">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
