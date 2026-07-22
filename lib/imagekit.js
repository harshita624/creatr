// Helper to build ImageKit transformation URLs
export const buildTransformationUrl = (src, transformations = []) => {
  if (!src) return "";
  if (!transformations || transformations.length === 0) return src;

  try {
    // Convert transformation objects to URL parameters
    const transformParams = transformations
      .map((transform) => {
        const params = [];

        // Handle resizing transformations
        if (transform.width) params.push(`w-${transform.width}`);
        if (transform.height) params.push(`h-${transform.height}`);
        if (transform.focus) params.push(`fo-${transform.focus}`);
        if (transform.cropMode) params.push(`cm-${transform.cropMode}`);

        // Handle effects
        if (transform.effect) params.push(`e-${transform.effect}`);

        // Handle background
        if (transform.background) params.push(`bg-${transform.background}`);

        // Handle quality
        if (transform.quality) params.push(`q-${transform.quality}`);

        // Handle format
        if (transform.format) params.push(`f-${transform.format}`);

        // Handle text overlays using layer syntax
        if (transform.overlayText) {
          const layerParams = [
            `l-text`,
            `i-${encodeURIComponent(transform.overlayText)}`,
          ];

          // Add font size
          if (transform.overlayTextFontSize) {
            layerParams.push(`fs-${transform.overlayTextFontSize}`);
          } else {
            layerParams.push(`fs-40`); // Default font size
          }

          // Add color
          if (transform.overlayTextColor) {
            layerParams.push(`co-${transform.overlayTextColor.replace("#", "")}`);
          } else {
            layerParams.push(`co-FFFFFF`); // Default white
          }

          // Add font family if specified
          if (transform.overlayTextFont) {
            layerParams.push(`ff-${transform.overlayTextFont}`);
          }

          // Add positioning
          if (transform.gravity) {
            // Map common gravity values to ImageKit positioning
            const gravityMap = {
              center: "center",
              north_west: "top_left",
              north_east: "top_right",
              south_west: "bottom_left",
              south_east: "bottom_right",
              north: "top",
              south: "bottom",
              west: "left",
              east: "right",
            };
            const mappedGravity = gravityMap[transform.gravity] || transform.gravity;
            layerParams.push(`lfo-${mappedGravity}`);
          }

          // Add padding
          if (transform.overlayTextPadding) {
            layerParams.push(`pa-${transform.overlayTextPadding}`);
          }

          // Add background color
          if (transform.overlayBackground) {
            layerParams.push(`bg-${transform.overlayBackground.replace("#", "")}`);
          }

          // Add opacity
          if (transform.overlayOpacity) {
            layerParams.push(`oa-${transform.overlayOpacity}`);
          }

          layerParams.push("l-end");
          return layerParams.join(",");
        }

        return params.join(",");
      })
      .filter((param) => param && param.length > 0)
      .join(":");

    if (!transformParams) return src;

    // Insert transformation parameters into URL
    if (src.includes("/tr:")) {
      // Already has transformations, replace them
      return src.replace(/\/tr:[^/]+/, `/tr:${transformParams}`);
    } else {
      // Add new transformations
      // ImageKit URL structure: https://ik.imagekit.io/your_id/tr:w-400,h-300/path/to/image.jpg
      const urlParts = src.split("/");
      
      // Find the position after domain and imagekit ID
      let insertIndex = -1;
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i].includes("ik.imagekit.io") || urlParts[i].includes("imagekit.io")) {
          insertIndex = i + 2; // After domain and ID
          break;
        }
      }

      if (insertIndex > 0 && insertIndex < urlParts.length) {
        urlParts.splice(insertIndex, 0, `tr:${transformParams}`);
        return urlParts.join("/");
      }

      // Fallback: insert before last segment (filename)
      const fileIndex = urlParts.length - 1;
      urlParts.splice(fileIndex, 0, `tr:${transformParams}`);
      return urlParts.join("/");
    }
  } catch (error) {
    console.error("Error building transformation URL:", error);
    return src; // Return original URL on error
  }
};

// Upload file to ImageKit using your server-side API
export const uploadToImageKit = async (file, fileName, folder = "blog-posts") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
    ];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Upload an image, video, or audio file.");
    }

    // Validate file size (80MB max for creator media)
    const maxSize = folder === "creator-media" ? 80 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName || file.name);
    formData.append("folder", folder);

    console.log("Uploading to ImageKit:", { fileName, folder, size: file.size });

    const response = await fetch("/api/imagekit/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    console.log("ImageKit upload successful:", result);

    return {
      success: true,
      data: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        filePath: result.filePath,
        width: result.width,
        height: result.height,
        size: result.size,
        thumbnailUrl: result.thumbnailUrl,
      },
    };
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return {
      success: false,
      error: error.message || "Upload failed",
    };
  }
};

// Delete file from ImageKit
export const deleteFromImageKit = async (fileId) => {
  try {
    if (!fileId) {
      throw new Error("No file ID provided");
    }

    const response = await fetch("/api/imagekit/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Delete failed");
    }

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("ImageKit delete error:", error);
    return {
      success: false,
      error: error.message || "Delete failed",
    };
  }
};

// Get optimized thumbnail URL
export const getThumbnailUrl = (url, width = 400, height = 300) => {
  return buildTransformationUrl(url, [
    {
      width,
      height,
      cropMode: "pad_resize",
      quality: 80,
      format: "webp",
    },
  ]);
};

// Get responsive image URLs for different screen sizes
export const getResponsiveUrls = (url) => {
  return {
    small: buildTransformationUrl(url, [{ width: 640, quality: 80, format: "webp" }]),
    medium: buildTransformationUrl(url, [{ width: 1024, quality: 80, format: "webp" }]),
    large: buildTransformationUrl(url, [{ width: 1920, quality: 85, format: "webp" }]),
    original: url,
  };
};

// Apply common image optimizations
export const getOptimizedUrl = (url, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = "webp",
    cropMode = "pad_resize",
  } = options;

  const transformations = [];

  if (width || height) {
    transformations.push({
      width,
      height,
      cropMode,
    });
  }

  transformations.push({
    quality,
    format,
  });

  return buildTransformationUrl(url, transformations);
};
