"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const handleFile = (f: File) => {
    const allowed = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/ogg", "audio/webm", "audio/x-m4a", "audio/flac"];
    if (!allowed.some((t) => f.type.includes(t.split("/")[1]))) {
      setError("Unsupported file type. Use WAV, MP3, M4A, OGG, WEBM, or FLAC.");
      return;
    }
    setFile(f);
    setError("");
    setTranscript("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const transcribe = async () => {
    if (!file) return;
    setTranscribing(true);
    setError("");
    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch("/api/stt/transcribe", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.text);

      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "stt", title: `File: ${file.name}`, content: data.text }),
      });
    } catch (err: any) {
      setError(err.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name || "transcription"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || !user) return null;

  return (
    <div className="ml-64 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">File Upload</h1>
        <p className="text-gray-400 mb-8">Upload an audio file and transcribe it with AI.</p>

        {/* Drop Zone */}
        <div
          className={`card border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-gray-700 hover:border-gray-600"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-300 font-medium">
                {file ? file.name : "Drop audio file here or click to browse"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "WAV, MP3, M4A, OGG, WEBM, FLAC"}
              </p>
            </div>
          </div>
        </div>

        {file && (
          <div className="mt-4 flex gap-3">
            <button onClick={transcribe} disabled={transcribing} className="btn-primary flex items-center gap-2">
              {transcribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Transcribing…
                </>
              ) : (
                "Transcribe"
              )}
            </button>
            <button onClick={() => { setFile(null); setTranscript(""); setError(""); }} className="btn-secondary">
              Clear
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {transcript && (
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Transcription</h2>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(transcript)} className="btn-secondary text-sm px-3 py-1.5">
                  Copy
                </button>
                <button onClick={downloadTxt} className="btn-primary text-sm px-3 py-1.5">
                  Download .txt
                </button>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}
