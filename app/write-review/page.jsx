"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, Sparkles, Heart } from "lucide-react";

export default function WriteReview() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const addReview = useMutation(api.reviews.addReview);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addReview({ name, message, rating });
      router.push("/#testimonials");
    } catch (error) {
      console.error("Error submitting review:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden no-header">
      
      {/* Decorative circles */}
      <div className="fixed top-20 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="fixed top-40 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="fixed bottom-20 right-40 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-gray-700 hover:text-purple-700 transition-colors px-4 py-2 rounded-full bg-white shadow-md hover:shadow-lg border border-gray-100"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl border border-purple-100 max-w-2xl w-full">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Share Your Experience
            </h1>
            <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
              Your feedback helps us improve and helps others make informed decisions
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name Input */}
            <div>
              <label className="block text-gray-700 mb-2 font-semibold text-sm">
                Your Name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-gray-50 to-purple-50 text-gray-900 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-400"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-gray-700 mb-3 font-semibold text-sm">
                Rating <span className="text-pink-500">*</span>
              </label>
              <div className="flex gap-3 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-all hover:scale-125 active:scale-95"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-lg"
                          : "text-gray-300"
                      } transition-all duration-200`}
                    />
                  </button>
                ))}
              </div>
              <div className="mt-4 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                  <span className="text-2xl">
                    {rating === 5 && "🎉"}
                    {rating === 4 && "👍"}
                    {rating === 3 && "👌"}
                    {rating === 2 && "😐"}
                    {rating === 1 && "😕"}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">
                    {rating === 5 && "Excellent!"}
                    {rating === 4 && "Great!"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Fair"}
                    {rating === 1 && "Needs improvement"}
                  </span>
                </div>
              </div>
            </div>

            {/* Review Message */}
            <div>
              <label className="block text-gray-700 mb-2 font-semibold text-sm">
                Your Review <span className="text-pink-500">*</span>
              </label>
              <textarea
                className="w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-gray-50 to-purple-50 text-gray-900 border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all h-40 resize-none placeholder:text-gray-400"
                placeholder="Tell us about your experience... What did you love? What could be better?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {message.length} characters
                </p>
                {message.length > 50 && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Looking good!
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 font-bold text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:transform hover:-translate-y-1 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </button>

          </form>

          {/* Footer note */}
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-purple-100">
            <p className="text-center text-sm text-gray-600 flex items-center justify-center gap-2">
              <span className="text-lg">✨</span>
              By submitting, you agree that your review will be publicly visible
            </p>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
