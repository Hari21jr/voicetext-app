"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white">SpeechApp</h1>
          <p className="text-gray-400 text-lg">Convert speech to text and text to speech with AI-powered transcription.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary text-lg px-8 py-3">Log In</Link>
            <Link href="/signup" className="btn-secondary text-lg px-8 py-3">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { href: "/stt", title: "Speech to Text", desc: "Record audio from your microphone and get instant AI transcription.", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z", color: "indigo" },
    { href: "/tts", title: "Text to Speech", desc: "Type text and hear it spoken aloud with customizable voice and speed.", icon: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z", color: "emerald" },
    { href: "/upload", title: "File Upload", desc: "Upload audio files for transcription and download results as text.", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12", color: "amber" },
    { href: "/history", title: "History", desc: "View and manage all your past transcriptions and speech items.", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "rose" },
  ];

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
    emerald: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-600/20 text-amber-400 border-amber-500/30",
    rose: "bg-rose-600/20 text-rose-400 border-rose-500/30",
  };

  const iconColorMap: Record<string, string> = {
    indigo: "bg-indigo-600/30 text-indigo-400",
    emerald: "bg-emerald-600/30 text-emerald-400",
    amber: "bg-amber-600/30 text-amber-400",
    rose: "bg-rose-600/30 text-rose-400",
  };

  return (
    <div className="ml-64 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome back, {user.username}</h1>
          <p className="text-gray-400 mt-1">What would you like to do today?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className={`card border hover:scale-[1.02] transition-transform duration-200 ${colorMap[c.color]}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorMap[c.color]}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={c.icon} />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{c.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">{c.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
