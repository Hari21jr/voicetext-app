"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface SharedItem {
  type: string;
  title: string;
  content: string;
  created_at: string;
}

export default function SharePage() {
  const params = useParams();
  const [item, setItem] = useState<SharedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/share/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setItem(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card text-center max-w-md">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
          <p className="text-gray-400">This shared item doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="card w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Shared Item</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                item?.type === "stt" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
              }`}>
                {item?.type === "stt" ? "Speech → Text" : "Text → Speech"}
              </span>
              {item?.created_at && (
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
        {item?.title && <h2 className="text-sm font-medium text-gray-400 mb-2">{item.title}</h2>}
        <div className="bg-gray-800 rounded-xl p-4 mt-2">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{item?.content}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(item?.content || "")}
          className="btn-secondary mt-4 text-sm"
        >
          Copy Text
        </button>
      </div>
    </div>
  );
}
