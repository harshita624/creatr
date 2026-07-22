"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { useConvexQuery, useConvexMutation } from "@/hooks/use-convex-query";
import { toast } from "sonner";
import { Loader2, Search, UserCheck, UserMinus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FollowersPage() {
  const { data: followersData, isLoading: loadingFollowers } = useConvexQuery(api.follows.getMyFollowers, { limit: 100 });
  const { data: followingData, isLoading: loadingFollowing } = useConvexQuery(api.follows.getMyFollowing, { limit: 100 });
  const { mutate: toggleFollow } = useConvexMutation(api.follows.toggleFollow);

  const [tab,    setTab]    = useState("followers");
  const [search, setSearch] = useState("");
  const [loadingIds, setLoadingIds] = useState(new Set());

  const followers = followersData || [];
  const following = followingData || [];

  const list = tab === "followers" ? followers : following;

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((u) =>
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  }, [list, search]);

  const handleToggle = async (userId) => {
    setLoadingIds((prev) => new Set([...prev, userId]));
    try { await toggleFollow({ followingId: userId }); }
    catch (err) { toast.error(err.message || "Failed"); }
    finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
    }
  };

  const isLoading = tab === "followers" ? loadingFollowers : loadingFollowing;

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-8">

      {/* Header */}
      <section className="app-panel overflow-hidden p-4 md:p-6 lg:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300" />
        <p className="section-label">Community</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Followers</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Followers",  value: followers.length },
            { label: "Following",  value: following.length },
            { label: "Follow-back",value: followers.filter((f) => f.followsBack).length },
            { label: "Mutuals",    value: followers.filter((f) => f.followsBack).length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-white/80 p-3 text-center sm:p-4">
              <p className="text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Tabs */}
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 self-start sm:self-auto">
          {["followers", "following"].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-orange-300 to-violet-300 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}>
              {t}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {t === "followers" ? followers.length : following.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="bg-white pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="app-panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-500">
              {search ? "No results match your search" : `No ${tab} yet`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                tab={tab}
                loading={loadingIds.has(user._id)}
                onToggle={() => handleToggle(user._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, tab, loading, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
      {/* Avatar */}
      {user.imageUrl ? (
        <Image src={user.imageUrl} alt={user.name || ""} width={44} height={44}
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-sm font-bold text-white">
          {user.name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {user.username || user.name}
        </p>
        <p className="truncate text-xs text-slate-400">{user.email || user.name}</p>
        {tab === "followers" && user.followsBack && (
          <span className="mt-0.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            Follows you back
          </span>
        )}
      </div>

      {/* Action */}
      <button type="button" onClick={onToggle} disabled={loading}
        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
          tab === "following"
            ? "border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            : user.followsBack
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-gradient-to-r from-orange-400 to-violet-500 text-white shadow-sm"
        }`}>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : tab === "following" ? (
          <>
            <UserMinus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Unfollow</span>
          </>
        ) : user.followsBack ? (
          <>
            <UserCheck className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Following</span>
          </>
        ) : (
          <span>Follow back</span>
        )}
      </button>
    </div>
  );
}