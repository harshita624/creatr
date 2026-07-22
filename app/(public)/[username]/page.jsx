"use client";

import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, UserPlus, UserCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useConvexQuery, useConvexMutation } from "@/hooks/use-convex-query";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import PostCard from "@/components/post-card";
import Link from "next/link";

export default function ProfilePage({ params }) {
  const { username } = React.use(params);
  const { user: currentUser } = useUser();

  // Get user profile
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useConvexQuery(api.users.getByUsername, { username });

  // Get user's posts
  const { data: postsData, isLoading: postsLoading } = useConvexQuery(
    api.public.getPublishedPostsByUsername,
    {
      username,
      limit: 20,
    }
  );

  // Get follower count
  const { data: followerCount } = useConvexQuery(
    api.follows.getFollowerCount,
    user ? { userId: user._id } : "skip"
  );

  // Check if current user is following this profile
  const { data: isFollowing } = useConvexQuery(
    api.follows.isFollowing,
    currentUser && user ? { followingId: user._id } : "skip"
  );

  // Follow mutation
  const toggleFollow = useConvexMutation(api.follows.toggleFollow);

  if (userLoading || postsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    notFound();
  }

  const posts = postsData?.posts || [];
  const isOwnProfile =
    currentUser && currentUser.publicMetadata?.username === user.username;

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error("Please sign in to follow users");
      return;
    }

    try {
      await toggleFollow.mutate({ followingId: user._id });
    } catch (error) {
      toast.error(error.message || "Failed to update follow status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Profile Header with Gradient Background */}
        <div className="relative mb-12">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 rounded-3xl opacity-30 blur-3xl -z-10"></div>
          
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-xl">
            <CardContent className="pt-12 pb-8">
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-6">
                  {user.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.name}
                      fill
                      className="rounded-full object-cover border-4 border-white shadow-lg ring-4 ring-purple-100"
                      sizes="112px"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-purple-100">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Online indicator or badge */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-400 rounded-full border-4 border-white shadow-md"></div>
                </div>

                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {user.name}
                </h1>

                <p className="text-xl text-gray-600 mb-6 font-medium">@{user.username}</p>

                {/* Follow Button */}
                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={toggleFollow.isLoading}
                    className={
                      isFollowing
                        ? "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-md mb-6"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/30 mb-6"
                    }
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}

                <div className="flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-full px-4 py-2 inline-flex">
                  <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-white border-purple-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                {posts.length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Posts</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                {followerCount || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Followers</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-1">
                {posts
                  .reduce((acc, post) => acc + (post.viewCount || 0), 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Views</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-pink-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-1">
                {posts
                  .reduce((acc, post) => acc + (post.likeCount || 0), 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Likes</div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Recent Posts
            </h2>
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>

          {posts.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-10 w-10 text-purple-500" />
                </div>
                <p className="text-gray-700 text-lg font-semibold mb-2">No posts yet</p>
                <p className="text-gray-500 text-sm">
                  Check back later for new content!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  showActions={false}
                  showAuthor={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}