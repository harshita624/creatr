// app/api/trends/worldwide/route.js
import { NextResponse } from 'next/server';

const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://localhost:5000';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'global';

    // Call local trend backend for analysis
    const mlResponse = await fetch(`${ML_BACKEND_URL}/analyze-worldwide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region })
    });

    if (!mlResponse.ok) {
      throw new Error('Trend analysis failed');
    }

    const mlData = await mlResponse.json();

    // Transform backend data to frontend format
    const trends = {
      hotTopics: mlData.trending_posts?.slice(0, 10).map((post, i) => ({
        topic: post.title,
        description: `Trend score: ${post.ml_trending_score.toFixed(2)}`,
        location: post.subreddit,
        volume: post.score + post.comments,
        growth: Math.floor(post.time_decay * 100),
        promoted: false
      })) || [],
      
      trendingHashtags: mlData.predicted_hashtags || [],
      
      contentIdeas: mlData.lda_topics?.slice(0, 4).map((topic, i) => ({
        title: `Topic ${i + 1}: ${topic.keywords.slice(0, 3).join(', ')}`,
        description: `Detected theme with ${topic.weight.toFixed(2)} relevance score`,
        suggestedHashtags: topic.keywords.slice(0, 3).map(k => `#${k}`)
      })) || [],
      
      insights: mlData.ml_insights || [],
      
      stats: {
        activeTrends: mlData.trending_posts?.length || 0,
        trendingTags: mlData.predicted_hashtags?.length || 0,
        totalVolume: '12.5M'
      }
    };

    return NextResponse.json(trends);

  } catch (error) {
    console.error('Trend API Error:', error);
    // Fallback to static trend data
    return NextResponse.json(getFallbackTrends());
  }
}
