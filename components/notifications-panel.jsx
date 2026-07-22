"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellOff, Check, Heart, MessageCircle, UserPlus } from "lucide-react";

const TYPE_ICON = {
  like:        { icon: Heart,          color: "text-red-500",    bg: "bg-red-50"    },
  comment:     { icon: MessageCircle,  color: "text-blue-500",   bg: "bg-blue-50"   },
  follow:      { icon: UserPlus,       color: "text-violet-500", bg: "bg-violet-50" },
  mention:     { icon: MessageCircle,  color: "text-orange-500", bg: "bg-orange-50" },
  story_view:  { icon: Bell,           color: "text-slate-500",  bg: "bg-slate-50"  },
};

const TYPE_TEXT = {
  like:        "liked your post",
  comment:     "commented on your post",
  follow:      "started following you",
  mention:     "mentioned you in a comment",
  story_view:  "viewed your story",
};

export default function NotificationsPanel({ onClose }) {
  const panelRef         = useRef(null);
  const notifications    = useQuery(api.notifications.getMyNotifications, { limit: 30 }) ?? [];
  const unreadCount      = useQuery(api.notifications.getUnreadCount) ?? 0;
  const markAllRead      = useMutation(api.notifications.markAllRead);
  const markRead         = useMutation(api.notifications.markRead);

  const [markingAll, setMarkingAll] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try { await markAllRead(); }
    finally { setMarkingAll(false); }
  };

  const handleRead = async (id, e) => {
    e.stopPropagation();
    await markRead({ notificationId: id });
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-0 sm:w-[380px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-bold text-slate-900">Notifications</p>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-violet-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <BellOff className="h-6 w-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
              <p className="mt-0.5 text-xs text-slate-400">
                When someone likes or comments on your posts, it shows up here.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = TYPE_ICON[n.type] || TYPE_ICON.like;
            const Icon = meta.icon;
            return (
              <div
                key={n._id}
                className={`relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${
                  !n.read ? "bg-orange-50/40" : ""
                }`}
              >
                {/* Unread dot */}
                {!n.read && (
                  <span className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500" />
                )}

                {/* Actor avatar */}
                <div className="relative shrink-0">
                  {n.actor?.imageUrl ? (
                    <Image
                      src={n.actor.imageUrl}
                      alt={n.actor.name || ""}
                      width={38}
                      height={38}
                      className="h-[38px] w-[38px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-400 text-sm font-bold text-white">
                      {n.actor?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {/* Type icon badge */}
                  <div className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ${meta.bg} ring-2 ring-white`}>
                    <Icon className={`h-2.5 w-2.5 ${meta.color}`} />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[13px] leading-5 text-slate-800">
                    <span className="font-semibold">
                      {n.actor?.username || n.actor?.name || "Someone"}
                    </span>{" "}
                    {TYPE_TEXT[n.type] || "interacted with you"}
                    {n.post?.title && (
                      <>
                        {" "}
                        <Link
                          href={
                            n.actor?.username && n.post
                              ? `/${n.actor.username}/${n.post._id}`
                              : "#"
                          }
                          className="font-medium text-slate-600 hover:text-orange-600 line-clamp-1"
                          onClick={onClose}
                        >
                          "{n.post.title}"
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Mark read button */}
                {!n.read && (
                  <button
                    onClick={(e) => handleRead(n._id, e)}
                    className="absolute right-3 top-3 rounded-full p-1 hover:bg-white"
                    title="Mark read"
                  >
                    <Check className="h-3 w-3 text-slate-400" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-center">
          <p className="text-[11px] text-slate-400">
            Showing last {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
}