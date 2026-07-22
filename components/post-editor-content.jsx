"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, ImageIcon, Sparkles, Wand2, Plus, Minus, Zap, Upload, X } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { generateBlogContent, improveContent } from "@/app/actions/ollama";
import { BarLoader } from "react-spinners";
import PostEnhancer from "./post-enhancer";
import AudienceSimulator from "./audience-simulator";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

if (typeof window !== "undefined") {
  import("react-quill-new/dist/quill.snow.css");
}

const quillConfig = {
  modules: {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        [{ size: ["small", false, "large", "huge"] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ["link", "blockquote", "code-block"],
        [
          { list: "ordered" },
          { list: "bullet" },
          { indent: "-1" },
          { indent: "+1" },
        ],
        ["image", "video"],
      ],
      handlers: { image: function () {} },
    },
  },
  formats: [
    "header",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "link",
    "blockquote",
    "code-block",
    "list",
    "indent",
    "image",
    "video",
  ],
};

export default function PostEditorContent({
  form,
  setQuillRef,
  onImageUpload,
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const watchedValues = watch();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [captionData, setCaptionData] = useState(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  const getQuillModules = () => ({
    ...quillConfig.modules,
    toolbar: {
      ...quillConfig.modules.toolbar,
      handlers: { image: () => onImageUpload("content") },
    },
  });

  const handleAI = async (type, improvementType = null) => {
    const { title, content, category, tags } = watchedValues;

    if (type === "generate") {
      if (!title?.trim())
        return toast.error("Please add a title before generating content");
      if (
        content &&
        content !== "<p><br></p>" &&
        !window.confirm("This will replace your existing content. Continue?")
      )
        return;
      setIsGenerating(true);
    } else {
      if (!content || content === "<p><br></p>")
        return toast.error("Please add some content before improving it");
      setIsImproving(true);
    }

    try {
      const result =
        type === "generate"
          ? await generateBlogContent(title, category, tags || [])
          : await improveContent(content, improvementType);

      if (result.success) {
        setValue("content", result.content);
        toast.success(
          `Content ${type === "generate" ? "generated" : improvementType + "d"} successfully!`
        );
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(`Failed to ${type} content. Please try again.`);
    } finally {
      type === "generate" ? setIsGenerating(false) : setIsImproving(false);
    }
  };

  const hasTitle = watchedValues.title?.trim();
  const hasContent =
    watchedValues.content && watchedValues.content !== "<p><br></p>";

  const generateCaption = async () => {
    if (!hasContent && !hasTitle) {
      toast.error("Add a title or content before generating captions");
      return;
    }

    setIsGeneratingCaption(true);
    try {
      const response = await fetch("/api/ai/caption-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: watchedValues.title,
          content: watchedValues.content,
          category: watchedValues.category,
        }),
      });
      const data = await response.json();
      setCaptionData(data);
      toast.success("Caption and hashtags generated");
    } catch {
      toast.error("Failed to generate caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const applyCaption = () => {
    if (!captionData) return;
    const hashtags = captionData.hashtags?.join(" ") || "";
    setValue(
      "content",
      `${watchedValues.content || ""}<p><strong>Caption:</strong> ${captionData.caption}</p><p>${hashtags}</p>`
    );
    toast.success("Caption added to post");
  };

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 py-10 page-enter">
        <div className="space-y-8">
          {/* Featured Image with Light Styling */}
          {watchedValues.featuredImage ? (
            <div className="app-panel relative group overflow-hidden">
              <img
                src={watchedValues.featuredImage}
                alt="Featured"
                className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-8 space-x-3">
                <Button
                  onClick={() => onImageUpload("featured")}
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-gray-700 shadow-lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change Image
                </Button>
                <Button
                  onClick={() => setValue("featuredImage", "")}
                  variant="destructive"
                  size="sm"
                  className="shadow-lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onImageUpload("featured")}
              className="app-panel w-full h-48 border-dashed flex flex-col items-center justify-center space-y-4 hover:border-orange-200 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 to-pink-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="bg-gradient-to-br from-orange-300 via-rose-300 to-violet-300 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-100">
                  <ImageIcon className="h-10 w-10 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 text-lg font-semibold mb-1">
                    Add a featured image
                  </p>
                  <p className="text-gray-500 text-sm">
                    Upload, crop, and enhance
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Title with Light Gradient */}
          <div className="relative">
            <Input
              {...register("title")}
              placeholder="Write a clear, irresistible title..."
              className="border-0 text-5xl font-bold bg-transparent placeholder:text-slate-300 text-slate-950 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
              style={{ fontSize: "3rem", lineHeight: "1.2" }}
            />
            {errors.title && (
              <p className="text-red-600 mt-3 text-sm flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Writing Tools Section */}
          <div className="app-panel p-6">
            {!hasContent ? (
              <Button
                onClick={() => handleAI("generate")}
                disabled={!hasTitle || isGenerating || isImproving}
                size="lg"
                className="soft-button w-full border-0 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <Wand2 className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
                <span className="relative z-10 font-semibold">Draft from title</span>
                <Sparkles className="h-4 w-4 ml-2 group-hover:scale-125 transition-transform duration-300 relative z-10" />
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Writing tools
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { 
                      type: "enhance", 
                      icon: Sparkles, 
                      gradient: "from-emerald-500 to-teal-500",
                      label: "Enhance"
                    },
                    { 
                      type: "expand", 
                      icon: Plus, 
                      gradient: "from-blue-500 to-cyan-500",
                      label: "Expand"
                    },
                    { 
                      type: "simplify", 
                      icon: Minus, 
                      gradient: "from-orange-500 to-amber-500",
                      label: "Simplify"
                    },
                  ].map(({ type, icon: Icon, gradient, label }) => (
                    <Button
                      key={type}
                      onClick={() => handleAI("improve", type)}
                      disabled={isGenerating || isImproving}
                      size="lg"
                      className={`bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                      <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300 relative z-10" />
                      <span className="relative z-10 font-medium">{label}</span>
                    </Button>
                  ))}
                </div>
                <div className="pt-3">
                  <Button
                    onClick={generateCaption}
                    disabled={isGeneratingCaption}
                    size="lg"
                    className="quiet-button w-full"
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    Generate caption + hashtags
                  </Button>
                </div>
              </div>
            )}
            {!hasTitle && (
              <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                Add a title to unlock content generation
              </p>
            )}
          </div>

          {/* Loading Bar with Light Colors */}
          {(isGenerating || isImproving) && (
            <div className="rounded-full overflow-hidden bg-purple-100 p-1">
              <BarLoader width={"100%"} color="#A78BFA" height={6} />
            </div>
          )}

          {captionData && (
            <div className="app-panel p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="section-label">Caption kit</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {captionData.caption}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {captionData.hashtags?.map((tag) => (
                      <span key={tag} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Button onClick={applyCaption} className="soft-button">
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Editor with Light Container */}
          <div className="prose prose-lg max-w-none app-panel p-8">
            <ReactQuill
              ref={setQuillRef}
              theme="snow"
              value={watchedValues.content}
              onChange={(content) => setValue("content", content)}
              modules={getQuillModules()}
              formats={quillConfig.formats}
              placeholder="Start writing your post..."
              style={{
                minHeight: "500px",
                fontSize: "1.125rem",
                lineHeight: "1.8",
              }}
            />
            {errors.content && (
              <p className="text-red-600 mt-4 text-sm flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full" />
                {errors.content.message}
              </p>
            )}
          </div>
          <PostEnhancer
  text={watchedValues.content} 
  onApplySuggestions={(newContent) => setValue("content", newContent)}
/>
          <AudienceSimulator text={watchedValues.content} />
        </div>
      </main>

      <style jsx global>{`
        /* Light Theme Quill Editor Styles */
        .ql-editor {
          color: #1f2937 !important;
          font-size: 1.125rem !important;
          line-height: 1.8 !important;
          padding: 0 !important;
          min-height: 500px !important;
        }
        .ql-editor::before {
          color: #9ca3af !important;
          font-style: italic !important;
        }
        .ql-toolbar {
          border: 1px solid #e5e7eb !important;
          padding: 1rem !important;
          position: sticky !important;
          top: 80px !important;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%) !important;
          z-index: 30 !important;
          border-radius: 12px !important;
          margin-bottom: 1.5rem !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
        }
        .ql-container {
          border: none !important;
        }
        .ql-snow .ql-tooltip {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          color: #1f2937 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }
        .ql-snow .ql-picker {
          color: #1f2937 !important;
        }
        .ql-snow .ql-picker-options {
          background: white !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .ql-snow .ql-picker-item:hover {
          background: rgba(147, 51, 234, 0.1) !important;
        }
        .ql-snow .ql-fill,
        .ql-snow .ql-stroke.ql-fill {
          fill: #4b5563 !important;
        }
        .ql-snow .ql-stroke {
          stroke: #4b5563 !important;
        }
        .ql-snow .ql-picker-label:hover,
        .ql-snow .ql-picker-item:hover {
          color: #9333ea !important;
        }
        .ql-toolbar button:hover {
          background: rgba(147, 51, 234, 0.1) !important;
          border-radius: 4px !important;
        }
        .ql-toolbar button.ql-active {
          background: rgba(147, 51, 234, 0.15) !important;
          border-radius: 4px !important;
        }
        .ql-snow .ql-fill:hover,
        .ql-snow .ql-stroke:hover {
          fill: #9333ea !important;
          stroke: #9333ea !important;
        }
        .ql-toolbar button.ql-active .ql-fill,
        .ql-toolbar button.ql-active .ql-stroke {
          fill: #9333ea !important;
          stroke: #9333ea !important;
        }
        
        /* Content Styling */
        .ql-editor h1 {
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          background: linear-gradient(135deg, #1f2937 0%, #6b7280 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          margin-bottom: 1rem !important;
        }
        .ql-editor h2 {
          font-size: 2rem !important;
          font-weight: 600 !important;
          background: linear-gradient(135deg, #374151 0%, #9ca3af 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        .ql-editor h3 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: #4b5563 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.5rem !important;
        }
        .ql-editor blockquote {
          border-left: 4px solid #a78bfa !important;
          background: rgba(147, 51, 234, 0.05) !important;
          color: #4b5563 !important;
          padding: 1rem 1.5rem !important;
          font-style: italic !important;
          border-radius: 0 8px 8px 0 !important;
          margin: 1.5rem 0 !important;
        }
        .ql-editor a {
          color: #9333ea !important;
          text-decoration: underline !important;
          text-decoration-color: rgba(147, 51, 234, 0.3) !important;
          transition: all 0.2s ease !important;
        }
        .ql-editor a:hover {
          color: #7c3aed !important;
          text-decoration-color: rgba(147, 51, 234, 0.6) !important;
        }
        .ql-editor code {
          background: #f3f4f6 !important;
          color: #ec4899 !important;
          padding: 0.25rem 0.5rem !important;
          border-radius: 0.375rem !important;
          font-family: 'Courier New', monospace !important;
          border: 1px solid #e5e7eb !important;
        }
        .ql-editor pre {
          background: #f9fafb !important;
          color: #1f2937 !important;
          padding: 1rem !important;
          border-radius: 8px !important;
          border: 1px solid #e5e7eb !important;
          overflow-x: auto !important;
        }
        .ql-editor img {
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .ql-editor ul,
        .ql-editor ol {
          color: #4b5563 !important;
          padding-left: 1.5rem !important;
        }
        .ql-editor li {
          margin-bottom: 0.5rem !important;
        }
        .ql-editor strong {
          color: #1f2937 !important;
          font-weight: 700 !important;
        }
        .ql-editor em {
          color: #6b7280 !important;
        }
      `}</style>
    </>
  );
}
