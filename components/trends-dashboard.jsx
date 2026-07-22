// components/trends-dashboard.jsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TrendsDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeframe, setTimeframe] = useState("week");
  
  // Get current trends
  const trends = useQuery(api.trends.getTrends);
  const analyzeTrends = useAction(api.trends.analyzeTrends);
  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeTrends({ timeframe });
    } catch (error) {
      console.error("Failed to analyze trends:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  if (!trends) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trending Now</h2>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Trends"}
          </button>
        </div>
        <p className="text-gray-500">No trend data available. Click &quot;Analyze Trends&quot; to start.</p>
      </div>
    );
  }
  
  const lastAnalyzed = new Date(trends.analyzedAt);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <p className="text-sm text-gray-500">
              Last analyzed: {lastAnalyzed.toLocaleString()} • {trends.total_posts_analyzed} posts
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Refresh Trends"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trending Hashtags */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">#</span>
            Trending Hashtags
          </h3>
          {trends.trending_hashtags && trends.trending_hashtags.length > 0 ? (
            <div className="space-y-3">
              {trends.trending_hashtags.map((hashtag, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-semibold text-blue-600">{hashtag.tag}</p>
                      <p className="text-sm text-gray-500">{hashtag.count} posts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      🔥 {hashtag.trend_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Engagement: {hashtag.engagement.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No trending hashtags found</p>
          )}
        </div>

        {/* Trending Keywords */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            Trending Keywords
          </h3>
          {trends.trending_keywords && trends.trending_keywords.length > 0 ? (
            <div className="space-y-3">
              {trends.trending_keywords.map((keyword, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-semibold">{keyword.keyword}</p>
                      <p className="text-sm text-gray-500">{keyword.count} mentions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      📈 {keyword.trend_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Engagement: {keyword.engagement.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No trending keywords found</p>
          )}
        </div>
      </div>

      {/* Topic Clusters */}
      {trends.topics && trends.topics.length > 0 && (
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Discovered Topics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trends.topics.map((topic, index) => (
              <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-lg">Topic {topic.topic_id + 1}</h4>
                  <span className="px-2 py-1 bg-white rounded-full text-sm font-medium">
                    {topic.post_count} posts
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topic.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white text-sm rounded-full shadow-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
