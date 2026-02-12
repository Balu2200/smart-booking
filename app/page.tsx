"use client";

import { useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function Home() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/dashboard";
      }
    });
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-white">
      <div className="bg-zinc-800 p-10 rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-6">
          Smart Bookmark Manager
        </h1>
        <button
          onClick={signIn}
          className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}