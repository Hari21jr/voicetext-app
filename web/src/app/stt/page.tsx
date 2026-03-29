"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function SpeechToTextPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError("");
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) {
          setError("No audio recorded.");
          return;
        }
        await sendAudio(blob);
      };

      mediaRecorder.start(250);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudio = async (blob: Blob) => {
    setTranscribing(true);
    setError("");
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const res = await fetch("/api/stt/transcribe", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranscript(data.text);

      // Save to history
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "stt", title: "Mic Recording", content: data.text }),
      });
    } catch (err: any) {
      setError(err.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (authLoading || !user) return null;

  return (
    <div className="ml-64 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Speech to Text</h1>
        <p className="text-gray-400 mb-8">Record audio from your microphone and transcribe it to text.</p>

        <div className="card text-center">
          {/* Recording Button */}
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              {recording && (
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse-ring" />
              )}
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  recording
                    ? "bg-red-500 hover:bg-red-400 scale-110"
                    : "bg-indigo-600 hover:bg-indigo-500"
                } disabled:opacity-50`}
              >
                {recording ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {recording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              <span className={`text-sm font-medium ${recording ? "text-red-400" : transcribing ? "text-amber-400" : "text-gray-400"}`}>
                {recording ? `Recording… ${formatTime(duration)}` : transcribing ? "Transcribing…" : "Click to start recording"}
              </span>
            </div>

            {transcribing && (
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {transcript && (
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Transcription</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(transcript)}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([transcript], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "transcript.txt";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
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
