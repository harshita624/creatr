"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Image as ImageIcon,
  Crop,
  Type,
  Wand2,
  Loader2,
  RefreshCw,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { buildTransformationUrl, uploadToImageKit } from "@/lib/imagekit";

// Form validation schema
const transformationSchema = z.object({
  aspectRatio: z.string().default("original"),
  customWidth: z.number().min(100).max(2000).default(800),
  customHeight: z.number().min(100).max(2000).default(600),
  smartCropFocus: z.string().default("auto"),
  textOverlay: z.string().optional(),
  textFontSize: z.number().min(12).max(200).default(50),
  textColor: z.string().default("#ffffff"),
  textPosition: z.string().default("center"),
  backgroundRemoved: z.boolean().default(false),
  dropShadow: z.boolean().default(false),
});

const ASPECT_RATIOS = [
  { label: "Original", value: "original" },
  { label: "Square (1:1)", value: "1:1", width: 400, height: 400 },
  { label: "Landscape (16:9)", value: "16:9", width: 800, height: 450 },
  { label: "Portrait (4:5)", value: "4:5", width: 400, height: 500 },
  { label: "Story (9:16)", value: "9:16", width: 450, height: 800 },
  { label: "Custom", value: "custom" },
];

const SMART_CROP_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "Face", value: "face" },
  { label: "Center", value: "center" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

const TEXT_POSITIONS = [
  { label: "Center", value: "center" },
  { label: "Top Left", value: "north_west" },
  { label: "Top Right", value: "north_east" },
  { label: "Bottom Left", value: "south_west" },
  { label: "Bottom Right", value: "south_east" },
  { label: "Top", value: "north" },
  { label: "Bottom", value: "south" },
  { label: "Left", value: "west" },
  { label: "Right", value: "east" },
];

export default function ImageUploadModal({
  isOpen,
  onClose,
  onImageSelect,
  title = "Upload & Transform Image",
}) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [transformedImage, setTransformedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  const form = useForm({
    resolver: zodResolver(transformationSchema),
    defaultValues: {
      aspectRatio: "original",
      customWidth: 800,
      customHeight: 600,
      smartCropFocus: "auto",
      textOverlay: "",
      textFontSize: 50,
      textColor: "#ffffff",
      textPosition: "center",
      backgroundRemoved: false,
      dropShadow: false,
    },
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `post-image-${Date.now()}-${file.name}`;
      const result = await uploadToImageKit(file, fileName);

      if (result.success) {
        setUploadedImage(result.data);
        setTransformedImage(result.data.url);
        setActiveTab("transform");
        toast.success("Image uploaded successfully!");
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    multiple: false,
  });

  // Apply transformations
  const applyTransformations = async () => {
    if (!uploadedImage) return;

    setIsTransforming(true);

    try {
      let transformationChain = [];

      if (watchedValues.aspectRatio !== "original") {
        const ratio = ASPECT_RATIOS.find(
          (r) => r.value === watchedValues.aspectRatio
        );
        if (ratio && ratio.width && ratio.height) {
          transformationChain.push({
            width: ratio.width,
            height: ratio.height,
            focus: watchedValues.smartCropFocus,
          });
        } else if (watchedValues.aspectRatio === "custom") {
          transformationChain.push({
            width: watchedValues.customWidth,
            height: watchedValues.customHeight,
            focus: watchedValues.smartCropFocus,
          });
        }
      }

      if (watchedValues.backgroundRemoved) {
        transformationChain.push({ effect: "removedotbg" });
      }

      if (watchedValues.dropShadow && watchedValues.backgroundRemoved) {
        transformationChain.push({ effect: "dropshadow" });
      }

      if (watchedValues.textOverlay?.trim()) {
        transformationChain.push({
          overlayText: watchedValues.textOverlay,
          overlayTextFontSize: watchedValues.textFontSize,
          overlayTextColor: watchedValues.textColor.replace("#", ""),
          gravity: watchedValues.textPosition,
          overlayTextPadding: 10,
        });
      }

      const transformedUrl = buildTransformationUrl(
        uploadedImage.url,
        transformationChain
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setTransformedImage(transformedUrl);
      toast.success("Transformations applied!");
    } catch (error) {
      console.error("Transformation error:", error);
      toast.error("Failed to apply transformations");
    } finally {
      setIsTransforming(false);
    }
  };

  const resetTransformations = () => {
    reset();
    setTransformedImage(uploadedImage?.url);
  };

  const handleSelectImage = () => {
    if (transformedImage) {
      console.log("Selecting image:", transformedImage);
      onImageSelect(transformedImage);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setUploadedImage(null);
    setTransformedImage(null);
    setActiveTab("upload");
    reset();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-6xl !h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-2xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Upload an image, crop it, and prepare it for publishing.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger value="upload" className="data-[state=active]:bg-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="transform" 
              disabled={!uploadedImage}
              className="data-[state=active]:bg-white"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Transform
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-purple-500 bg-purple-50 scale-[1.02]"
                  : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/30"
              }`}
            >
              <input {...getInputProps()} />

              {isUploading ? (
                <div className="space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent absolute top-0"></div>
                  </div>
                  <p className="text-gray-700 font-medium">Uploading image...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      {isDragActive
                        ? "Drop your image here"
                        : "Drag & drop an image here"}
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse (JPG, PNG, WebP, GIF - Max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadedImage && (
              <div className="text-center space-y-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2">
                  <Check className="h-4 w-4 mr-2" />
                  Image uploaded successfully!
                </Badge>
                <div className="text-sm text-gray-600 font-medium">
                  {uploadedImage.width} × {uploadedImage.height} •{" "}
                  {Math.round(uploadedImage.size / 1024)}KB
                </div>
                <Button
                  onClick={() => setActiveTab("transform")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Transforming
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transform" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              {/* Transformation Controls */}
              <div className="space-y-6">
                {/* Transformations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Wand2 className="h-5 w-5 mr-2 text-purple-600" />
                    Image tools
                  </h3>

                  {/* Background Removal */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-900 font-semibold">
                        Remove Background
                      </Label>
                      <Button
                        type="button"
                        variant={watchedValues.backgroundRemoved ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setValue("backgroundRemoved", !watchedValues.backgroundRemoved)
                        }
                        className={watchedValues.backgroundRemoved ? "bg-purple-600" : ""}
                      >
                        {watchedValues.backgroundRemoved ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Clean background removal
                    </p>
                  </div>

                  {/* Drop Shadow */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-gray-900 font-semibold">
                        Drop Shadow
                      </Label>
                      <Button
                        type="button"
                        variant={watchedValues.dropShadow ? "default" : "outline"}
                        size="sm"
                        disabled={!watchedValues.backgroundRemoved}
                        onClick={() =>
                          setValue("dropShadow", !watchedValues.dropShadow)
                        }
                        className={watchedValues.dropShadow ? "bg-blue-600" : ""}
                      >
                        {watchedValues.dropShadow ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {watchedValues.backgroundRemoved
                        ? "Add realistic shadow"
                        : "Requires background removal"}
                    </p>
                  </div>
                </div>

                {/* Resize & Crop */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Crop className="h-5 w-5 mr-2 text-blue-600" />
                    Resize & Crop
                  </h3>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Aspect Ratio</Label>
                    <Select
                      value={watchedValues.aspectRatio}
                      onValueChange={(value) => setValue("aspectRatio", value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ratio) => (
                          <SelectItem key={ratio.value} value={ratio.value}>
                            {ratio.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedValues.aspectRatio === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-700 font-medium">Width</Label>
                        <Input
                          type="number"
                          value={watchedValues.customWidth}
                          onChange={(e) =>
                            setValue("customWidth", parseInt(e.target.value) || 800)
                          }
                          min="100"
                          max="2000"
                          className="bg-white border-gray-300"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 font-medium">Height</Label>
                        <Input
                          type="number"
                          value={watchedValues.customHeight}
                          onChange={(e) =>
                            setValue("customHeight", parseInt(e.target.value) || 600)
                          }
                          min="100"
                          max="2000"
                          className="bg-white border-gray-300"
                        />
                      </div>
                    </div>
                  )}

                  {watchedValues.aspectRatio !== "original" && (
                    <div className="space-y-3">
                      <Label className="text-gray-700 font-medium">Smart Crop Focus</Label>
                      <Select
                        value={watchedValues.smartCropFocus}
                        onValueChange={(value) => setValue("smartCropFocus", value)}
                      >
                        <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SMART_CROP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Text Overlay */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Type className="h-5 w-5 mr-2 text-pink-600" />
                    Text Overlay
                  </h3>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">Text</Label>
                    <Textarea
                      value={watchedValues.textOverlay}
                      onChange={(e) => setValue("textOverlay", e.target.value)}
                      placeholder="Enter text to overlay..."
                      rows={3}
                      className="bg-white border-gray-300"
                    />
                  </div>

                  {watchedValues.textOverlay && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-gray-700 font-medium">
                          Font Size: {watchedValues.textFontSize}px
                        </Label>
                        <Slider
                          value={[watchedValues.textFontSize]}
                          onValueChange={(value) => setValue("textFontSize", value[0])}
                          max={200}
                          min={12}
                          step={2}
                          className="w-full"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Text Color</Label>
                          <Input
                            type="color"
                            value={watchedValues.textColor}
                            onChange={(e) => setValue("textColor", e.target.value)}
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Position</Label>
                          <Select
                            value={watchedValues.textPosition}
                            onValueChange={(value) => setValue("textPosition", value)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEXT_POSITIONS.map((position) => (
                                <SelectItem key={position.value} value={position.value}>
                                  {position.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={applyTransformations}
                    disabled={isTransforming}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                  >
                    {isTransforming ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Apply
                  </Button>

                  <Button 
                    onClick={resetTransformations} 
                    variant="outline"
                    className="border-gray-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Preview
                </h3>

                {transformedImage && (
                  <div className="relative">
                    <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                      <img
                        src={transformedImage}
                        alt="Transformed preview"
                        className="w-full h-auto max-h-96 object-contain rounded-xl mx-auto shadow-lg"
                        onError={() => {
                          toast.error("Failed to load transformed image");
                          setTransformedImage(uploadedImage?.url);
                        }}
                      />
                    </div>

                    {isTransforming && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                        <div className="bg-white rounded-xl p-6 flex items-center space-x-3 shadow-xl border border-gray-200">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="text-gray-900 font-medium">
                            Applying transformations...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {uploadedImage && transformedImage && (
                  <div className="text-center space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 font-medium">
                      Your transformed image is ready.
                    </p>

                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={handleSelectImage}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                        size="lg"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Use This Image
                      </Button>

                      <Button
                        onClick={handleClose}
                        variant="outline"
                        size="lg"
                        className="border-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
