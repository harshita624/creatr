"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Save,
  Send,
  Settings,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const PostEditorHeader = ({
  mode,
  initialData,
  isPublishing,
  onSave,
  onPublish,
  onSchedule,
  onSettingsOpen,
  onBack,
}) => {
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);

  const isDraft = initialData?.status === "draft";
  const isEdit = mode === "edit";
  const isPublished = initialData?.status === "published";

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm z-40">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Back</span>
          </Button>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {isDraft && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 font-medium px-3 py-1 shadow-sm">
                <Clock className="h-3 w-3 mr-1.5" />
                Draft
              </Badge>
            )}
            {isPublished && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 font-medium px-3 py-1 shadow-sm">
                <CheckCircle className="h-3 w-3 mr-1.5" />
                Published
              </Badge>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsOpen}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100/0 via-purple-100/50 to-purple-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md" />
            <Settings className="h-4 w-4 relative z-10 group-hover:rotate-90 transition-transform duration-500" />
          </Button>

          {/* Save Button (only in create mode) */}
          {!isEdit && (
            <Button
              onClick={onSave}
              disabled={isPublishing}
              variant="outline"
              size="sm"
              className="text-gray-700 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-all duration-300 group"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
              )}
              <span className="font-medium">Save Draft</span>
            </Button>
          )}

          {/* Update/Publish Button */}
          {isEdit ? (
            <Button
              disabled={isPublishing}
              onClick={() => {
                onPublish();
                setIsPublishMenuOpen(false);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 transition-all duration-300 font-semibold px-6 group relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin relative z-10" />
              ) : (
                <Send className="h-4 w-4 mr-2 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
              )}
              <span className="relative z-10">Update Post</span>
            </Button>
          ) : (
            <DropdownMenu
              open={isPublishMenuOpen}
              onOpenChange={setIsPublishMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={isPublishing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 transition-all duration-300 font-semibold px-6 group relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin relative z-10" />
                  ) : (
                    <Send className="h-4 w-4 mr-2 relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
                  )}
                  <span className="relative z-10">Publish</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-white backdrop-blur-xl border-gray-200 shadow-xl mt-2"
              >
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    Publish Options
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose when to publish
                  </p>
                </div>

                <DropdownMenuSeparator className="bg-gray-200" />

                <DropdownMenuItem
                  onClick={() => {
                    onPublish();
                    setIsPublishMenuOpen(false);
                  }}
                  className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 text-gray-700 transition-colors duration-200 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-1.5 rounded-md mr-3 group-hover:bg-purple-200 transition-colors duration-200">
                        <Send className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Publish Now</p>
                        <p className="text-xs text-gray-500">
                          Make it live immediately
                        </p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    onSchedule();
                    setIsPublishMenuOpen(false);
                  }}
                  className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 text-gray-700 transition-colors duration-200 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-1.5 rounded-md mr-3 group-hover:bg-blue-200 transition-colors duration-200">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Schedule</p>
                        <p className="text-xs text-gray-500">
                          Choose a date and time
                        </p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default PostEditorHeader;