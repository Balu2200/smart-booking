"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  user_id: string;
  created_at: string;
};

export default function Dashboard() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

 
  const fetchBookmarks = async (uid: string) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH ERROR:", error);
      return;
    }

    setBookmarks(data || []);
  };

  useEffect(() => {
    let channel: any;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/";
        return;
      }

      const uid = data.session.user.id;
      setUserId(uid);

      await fetchBookmarks(uid);
      setLoading(false);


      channel = supabase
        .channel("realtime-bookmarks")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookmarks",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setBookmarks((prev) => {
                const exists = prev.find((b) => b.id === payload.new.id);
                if (exists) return prev;
                return [payload.new as Bookmark, ...prev];
              });
            }

            if (payload.eventType === "DELETE") {
              setBookmarks((prev) =>
                prev.filter((b) => b.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);


  const addBookmark = async () => {
    if (!title || !url || !userId) return;

    const { error } = await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: userId,
    });

    if (error) {
      console.error("INSERT ERROR:", error);
      return;
    }

    setTitle("");
    setUrl("");
  };


  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE ERROR:", error);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex justify-center py-16">
      <div className="w-full max-w-2xl bg-zinc-800 rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Your Bookmarks</h1>
          <button
            onClick={logout}
            className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            placeholder="Title"
            className="flex-1 bg-zinc-700 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            placeholder="URL"
            className="flex-1 bg-zinc-700 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <button
            onClick={addBookmark}
            className="bg-green-600 px-5 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {bookmarks.length === 0 && (
            <p className="text-zinc-400 text-sm">
              No bookmarks yet. Add your first one.
            </p>
          )}

          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="flex justify-between items-center bg-zinc-700 px-4 py-3 rounded-lg"
            >
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {b.title}
              </a>

              <button
                onClick={() => deleteBookmark(b.id)}
                className="text-red-400 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}