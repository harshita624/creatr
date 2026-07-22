"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Clock,
  DollarSign,
  Radio,
  Sparkles,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PostCard = ({
  post,
  showActions = false,
  showAuthor = true,
  onEdit,
  onDelete,
  onDuplicate,
  className = "",
  style,
}) => {
  const [now] = React.useState(() => Date.now());

  // Get status badge configuration
  const getStatusBadge = (post) => {
    if (post.status === "published") {
      if (post.scheduledFor && post.scheduledFor > now) {
        return {
          variant: "secondary",
          className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
          icon: Clock,
          label: "Scheduled",
        };
      }
      return {
        variant: "default",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
        icon: Sparkles,
        label: "Published",
      };
    }
    return {
      variant: "outline",
      className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
      icon: Edit,
      label: "Draft",
    };
  };

  // Get post URL for public viewing
  const getPostUrl = () => {
    if (
      post.status === "published" &&
      (post.author?.username || post?.username)
    ) {
      return `/${post.author?.username || post?.username}/${post._id}`;
    }
    return null;
  };

  const statusBadge = getStatusBadge(post);
  const publicUrl = getPostUrl();
  const StatusIcon = statusBadge.icon;
  const contentType = post.contentType || "article";
  const isVideoLike = ["reel", "video", "livestream"].includes(contentType);
  const embedUrl = post.mediaUrl ? getEmbeddableMediaUrl(post.mediaUrl) : null;
  const isAudio = contentType === "podcast";
  const displayImage = post.featuredImage || (isLikelyImageUrl(post.mediaUrl) ? post.mediaUrl : null);
  const typeLabels = {
    article: "Article",
    reel: "Reel",
    video: "Video",
    livestream: "Live",
    podcast: "Audio",
    carousel: "Carousel",
  };

  return (
    <Card
      className={`group relative overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-2xl hover:border-purple-200 transition-all duration-300 rounded-2xl ${className}`}
      style={style}
    >
      {/* Gradient Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-pink-100/50 to-blue-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl -z-10" />
      
      <CardContent className="p-0">
        {/* Featured Image with Overlay */}
        <div
          className="relative aspect-video min-h-[220px] overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-t-2xl"
          onContextMenu={(event) => {
            if (isVideoLike) event.preventDefault();
          }}
        >
          {publicUrl && !isVideoLike && !isAudio && (
            <Link href={publicUrl} aria-label={`Read ${post.title || "post"}`} className="absolute inset-0 z-[1]" />
          )}
          {embedUrl && isVideoLike ? (
            <iframe
              src={embedUrl}
              title={post.title || "Creator video"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : post.mediaUrl && isVideoLike ? (
            <video
              src={post.mediaUrl}
              poster={post.featuredImage}
              controls
              controlsList="nodownload noplaybackrate"
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : post.mediaUrl && isAudio ? (
            <div className="absolute inset-x-6 bottom-8 rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur">
              <audio src={post.mediaUrl} controls className="w-full" />
            </div>
          ) : displayImage ? (
            <>
              <Image
                src={displayImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center shadow-lg">
                  {isVideoLike ? (
                    <Video className="w-10 h-10 text-purple-600" />
                  ) : contentType === "livestream" ? (
                    <Radio className="w-10 h-10 text-purple-600" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-purple-600" />
                  )}
                </div>
                <p className="text-gray-400 font-medium">{typeLabels[contentType] || "Post"}</p>
              </div>
            </div>
          )}

          {/* Status Badge - Top Left */}
          <div className="absolute top-4 left-4 z-10">
            <Badge
              variant={statusBadge.variant}
              className={`${statusBadge.className} backdrop-blur-md shadow-lg border-2 px-3 py-1.5 font-semibold rounded-full`}
            >
              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
              {statusBadge.label}
            </Badge>
          </div>

          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
            <Badge className="bg-white/95 text-slate-700 border-white/70 backdrop-blur-md shadow-lg px-3 py-1.5 font-semibold rounded-full">
              {contentType === "livestream" ? (
                <Radio className="mr-1.5 h-3.5 w-3.5 text-red-500" />
              ) : isVideoLike ? (
                <Video className="mr-1.5 h-3.5 w-3.5 text-violet-500" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
              )}
              {typeLabels[contentType] || "Post"}
            </Badge>
            {post.monetization && post.monetization !== "free" && (
              <Badge className="bg-amber-50/95 text-amber-700 border-amber-100 backdrop-blur-md shadow-lg px-3 py-1.5 font-semibold rounded-full">
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                {post.monetization === "members" ? "Members" : "Paid"}
              </Badge>
            )}
          </div>

          {/* Scheduled Date - Top Right */}
          {post.scheduledFor && post.scheduledFor > now && (
            <div className="absolute top-4 right-4 z-10">
              <Badge className="bg-white/95 text-gray-700 border-gray-200 backdrop-blur-md shadow-lg px-3 py-1.5 font-medium rounded-full">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {new Date(post.scheduledFor).toLocaleDateString()}
              </Badge>
            </div>
          )}

          {/* Actions Menu - Bottom Right */}
          {showActions && (
            <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-white/95 hover:bg-white text-gray-700 backdrop-blur-md shadow-lg border-0 rounded-full w-10 h-10 p-0"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-gray-100 shadow-xl rounded-xl">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={() => onEdit(post)}
                      className="cursor-pointer hover:bg-purple-50 text-gray-700 rounded-lg"
                    >
                      <Edit className="w-4 h-4 mr-2 text-purple-600" />
                      Edit Post
                    </DropdownMenuItem>
                  )}
                  {publicUrl && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={publicUrl}
                        target="_blank"
                        className="cursor-pointer hover:bg-blue-50 text-gray-700 rounded-lg flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2 text-blue-600" />
                        View Public
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem
                      onClick={() => onDuplicate(post)}
                      className="cursor-pointer hover:bg-green-50 text-gray-700 rounded-lg"
                    >
                      <Copy className="w-4 h-4 mr-2 text-green-600" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator className="bg-gray-100" />
                      <DropdownMenuItem
                        onClick={() => onDelete(post)}
                        className="cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
            {publicUrl ? (
              <Link href={publicUrl} className="relative z-10 hover:underline">
                {post.title || "Untitled Post"}
              </Link>
            ) : (
              post.title || "Untitled Post"
            )}
          </h3>

          {/* Author */}
          {showAuthor && post.author && (
            <Link href={`/${post.author.username}`}>
              <div className="flex items-center gap-3 group/author cursor-pointer">
                <div className="relative">
                  {post.author.imageUrl ? (
                    <Image
                      src={post.author.imageUrl}
                      alt={post.author.name}
                      width={40}
                      height={40}
                      className="rounded-full ring-2 ring-purple-100 group-hover/author:ring-purple-300 transition-all"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center ring-2 ring-purple-100 group-hover/author:ring-purple-300 transition-all">
                      <span className="text-white font-semibold text-sm">
                        {post.author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate group-hover/author:text-purple-700 transition-colors">
                    {post.author.name}
                  </p>
                  {post.author.username && (
                    <p className="text-sm text-gray-500 truncate">
                      @{post.author.username}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-pink-100 transition-colors px-3 py-1 rounded-full"
                >
                  #{tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 rounded-full"
                >
                  +{post.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Stats & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              {/* Views */}
              <div className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">
                <div className="p-1.5 bg-blue-50 rounded-full">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold">
                  {post.viewCount?.toLocaleString() || 0}
                </span>
              </div>

              {/* Likes */}
              <div className="flex items-center gap-1.5 text-gray-600 hover:text-pink-600 transition-colors cursor-pointer">
                <div className="p-1.5 bg-pink-50 rounded-full">
                  <Heart className="w-4 h-4 text-pink-600" />
                </div>
                <span className="text-sm font-semibold">
                  {post.likeCount?.toLocaleString() || 0}
                </span>
              </div>

              {/* Comments */}
              <div className="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors cursor-pointer">
                <div className="p-1.5 bg-purple-50 rounded-full">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold">
                  {post.commentCount?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex shrink-0 items-center gap-1.5 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {post.status === "published" && post.publishedAt
                  ? formatDistanceToNow(new Date(post.publishedAt), {
                      addSuffix: true,
                    })
                  : formatDistanceToNow(new Date(post.updatedAt), {
                      addSuffix: true,
                    })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Top Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
};

function getEmbeddableMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isLikelyImageUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return /\.(avif|gif|jpe?g|png|webp)$/i.test(parsed.pathname);
  } catch {
    return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(url);
  }
}

export default PostCard;
