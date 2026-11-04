"use client";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/profile";

export default function FollowButton({ userId, initialFollowing, initialCount }: { userId: string; initialFollowing: boolean; initialCount: number }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => {
      const r = await toggleFollow(userId);
      if (r.error) return;
      setFollowing(!!r.following);
      setCount((c) => c + (r.following ? 1 : -1));
    })}
      className={`px-5 py-2 text-sm font-bold ${following ? "border-2 border-slate9 hover:bg-slate3/50" : "bg-slate9 text-paper hover:bg-gold hover:text-night"} disabled:opacity-50`}>
      {following ? "Following" : "Follow"}
    </button>
  );
}
