"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import PostEditorHeader from "./post-editor-header";
import FormatEditorContent from "./format-editor-content";
import PostEditorSettings from "./post-editor-settings";
import { toast } from "sonner";
import ImageUploadModal from "./image-upload-modal";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10),
  featuredImage: z.string().optional(),
  contentType: z.enum(["article", "reel", "video", "livestream", "podcast", "carousel"]).optional(),
  mediaUrl: z.string().optional(),
  monetization: z.enum(["free", "members", "paid"]).optional(),
  priceCents: z.number().min(0).optional(),
  allowComments: z.boolean().optional(),
  postMeta: z.object({
    seoKeywords: z.string().optional(),
    visibility: z.string().optional(),
    caption: z.string().optional(),
    location: z.string().optional(),
    music: z.string().optional(),
    chapters: z.string().optional(),
    playlist: z.string().optional(),
    episodeNumber: z.string().optional(),
    showNotes: z.string().optional(),
    ctaSlide: z.string().optional(),
    collaborators: z.string().optional(),
    readinessNotes: z.string().optional(),
  }).optional(),
  scheduledFor: z.string().optional(),
});

const mediaTypes = ["reel", "video", "podcast", "carousel"];

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PostEditor = ({ initialData = null, initialContentType = "article", mode = "create" }) => {
  const router = useRouter();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalType, setImageModalType] = useState("featured");
  const [currentPostId, setCurrentPostId] = useState(initialData?._id || null);

  const { mutate: createPost, isLoading: isCreateLoading } =
    useConvexMutation(api.posts.create);

  const { mutate: updatePost, isLoading: isUpdating } =
    useConvexMutation(api.posts.update);

  const form = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "",
      tags: initialData?.tags || [],
      featuredImage: initialData?.featuredImage || "",
      contentType: initialData?.contentType || initialContentType,
      mediaUrl: initialData?.mediaUrl || "",
      monetization: initialData?.monetization || "free",
      priceCents: initialData?.priceCents ?? undefined,
      allowComments: initialData?.allowComments ?? true,
      postMeta: initialData?.postMeta || {},
      scheduledFor: initialData?.scheduledFor
        ? new Date(initialData.scheduledFor).toISOString().slice(0, 16)
        : "",
    },
  });

  const { handleSubmit, watch, setValue, getValues } = form;

  useEffect(() => {
    if (mode !== "create") return;

    const autoSave = setInterval(() => {
      const { title, content } = getValues();
      if (title || content) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(autoSave);
  }, [mode]);

  const submitPost = async (data, action, silent = false) => {
    try {
      if (action === "publish") {
        if (!data.title || data.title.trim().length < 10) {
          toast.error("Title must be at least 10 characters");
          return;
        }
        const contentType = data.contentType || "article";
        const plainContent = stripHtml(data.content);

        if (contentType === "article" && plainContent.length < 100) {
          toast.error("Post content must be at least 100 characters");
          return;
        }

        if (mediaTypes.includes(contentType) && contentType !== "carousel" && !data.mediaUrl?.trim()) {
          toast.error(`${contentType === "podcast" ? "Podcast" : contentType === "reel" ? "Reel" : "Video"} needs a media file or URL`);
          return;
        }

        if (contentType === "livestream" && !data.mediaUrl?.trim()) {
          // The native LiveKit studio doesn't write to mediaUrl, so this
          // only blocks publishing if you're relying purely on an external
          // link with no native go-live yet. Native streams can still be
          // started from the editor before or after the post is published.
        }

        if (data.monetization === "paid" && (!data.priceCents || data.priceCents <= 0)) {
          toast.error("Set a price greater than $0 for a paid post");
          return;
        }
      }

      const postData = {
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category || undefined,
        tags: data.tags || [],
        featuredImage: data.featuredImage || undefined,
        contentType: data.contentType || "article",
        mediaUrl: data.mediaUrl || undefined,
        monetization: data.monetization || "free",
        priceCents: data.monetization === "paid" ? Math.round(data.priceCents || 0) : undefined,
        allowComments: data.allowComments ?? true,
        postMeta: data.postMeta || undefined,
        status: action === "publish" || action === "schedule" ? "published" : "draft",
        scheduledFor: data.scheduledFor
          ? new Date(data.scheduledFor).getTime()
          : undefined,
      };

      let resultId;

      const existingPostId = initialData?._id || currentPostId;

      if (mode === "edit" && initialData?._id) {
        resultId = await updatePost({ id: initialData._id, ...postData });
      } else if (existingPostId) {
        resultId = await updatePost({ id: existingPostId, ...postData });
      } else {
        resultId = await createPost(postData);
      }

      setCurrentPostId(resultId);

      if (!silent) {
        toast.success(
          action === "publish"
            ? "🎉 Post Published Successfully!"
            : action === "schedule"
            ? "📅 Post Scheduled Successfully!"
            : "💾 Draft Saved Successfully!"
        );

        if (action === "publish") {
          router.push("/dashboard/posts");
        }
      }

      return resultId;
    } catch (err) {
      console.error("Submit error:", err);
      if (!silent) {
        toast.error(err?.message || "Failed to save post. Please try again.");
      }
      throw err;
    }
  };

  const handleSave = (silent = false) =>
    handleSubmit((data) => submitPost(data, "draft", silent))();

  const ensureDraft = () =>
    handleSubmit((data) => submitPost(data, "draft", true))();

  const handleSettingsSave = () => {
    const { title, content } = getValues();
    if (!title?.trim() || !stripHtml(content)) {
      toast.success("Settings applied");
      return Promise.resolve();
    }

    return handleSave(false);
  };

  const handlePublish = () => {
    handleSubmit((data) => submitPost(data, "publish"))();
  };

  const handleSchedule = () => {
    const scheduledTime = watch("scheduledFor");
    if (!scheduledTime) {
      toast.error("Please select a date and time to schedule");
      return;
    }
    
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    
    if (scheduledDate <= now) {
      toast.error("Scheduled time must be in the future");
      return;
    }
    
    handleSubmit((data) => submitPost(data, "schedule"))();
  };

  const handleImageSelect = (imageData) => {
    const imageUrl = typeof imageData === 'string' ? imageData : imageData?.url;

    if (!imageUrl) {
      toast.error("Invalid image data");
      return;
    }

    if (imageModalType === "featured") {
      setValue("featuredImage", imageUrl, { shouldValidate: true });
      toast.success("Featured image updated!");
    }

    setIsImageModalOpen(false);
  };

  return (
    <div className="creator-shell">
      <PostEditorHeader
        mode={mode}
        initialData={initialData}
        isPublishing={isCreateLoading || isUpdating}
        onSave={handleSave}
        onPublish={handlePublish}
        onSchedule={handleSchedule}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onBack={() => router.push("/dashboard/posts")}
      />

      <FormatEditorContent
        form={form}
        postId={currentPostId}
        onEnsureDraft={ensureDraft}
        onImageUpload={(type) => {
          setImageModalType(type);
          setIsImageModalOpen(true);
        }}
      />

      <PostEditorSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
        form={form}
        mode={mode}
      />

      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImageSelect={handleImageSelect}
        title={
          imageModalType === "featured"
            ? "Upload Featured Image"
            : "Insert Image"
        }
      />
    </div>
  );
};

export default PostEditor;