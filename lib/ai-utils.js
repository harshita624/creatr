export function stripHtml(value) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function rankPostsLocally(posts = [], intent = "") {
  const intentWords = tokenize(intent);

  return posts
    .map((post) => {
      const title = post.title || "";
      const text = stripHtml(post.content || "");
      const haystack = `${title} ${(post.tags || []).join(" ")} ${post.category || ""} ${text}`;
      const words = tokenize(haystack);
      const matchScore = intentWords.reduce(
        (score, word) => score + (words.includes(word) ? 10 : 0),
        0
      );
      const engagement =
        (post.viewCount || 0) + (post.likeCount || 0) * 4 + (post.commentCount || 0) * 8;
      const freshness = post.publishedAt || post.createdAt || post.updatedAt || 0;
      const ageHours = freshness ? Math.max(1, (Date.now() - freshness) / 3600000) : 120;
      const recencyScore = Math.max(0, 20 - Math.floor(ageHours / 12));
      const qualityScore = Math.min(25, Math.floor(stripHtml(post.content || "").length / 120));
      const score = Math.min(100, 35 + matchScore + recencyScore + qualityScore + Math.min(20, Math.log10(engagement + 1) * 8));

      return {
        id: post._id,
        score: Math.round(score),
        why: buildRecommendationReason(post, matchScore, engagement),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export function searchPostsLocally(query = "", posts = []) {
  const queryWords = tokenize(query);
  if (!queryWords.length) return [];

  return posts
    .map((post) => {
      const title = post.title || "";
      const tags = (post.tags || []).join(" ");
      const category = post.category || "";
      const text = stripHtml(post.content || "");
      const searchable = `${title} ${tags} ${category} ${text}`.toLowerCase();
      const directMatches = queryWords.filter((word) => searchable.includes(word)).length;
      const titleMatches = queryWords.filter((word) => title.toLowerCase().includes(word)).length;
      const tagMatches = queryWords.filter((word) => tags.toLowerCase().includes(word)).length;
      const engagement = (post.viewCount || 0) + (post.likeCount || 0) * 3 + (post.commentCount || 0) * 5;
      const score = Math.min(
        100,
        directMatches * 18 + titleMatches * 16 + tagMatches * 12 + Math.min(16, Math.log10(engagement + 1) * 6)
      );

      return {
        id: post._id,
        score: Math.round(score),
        reason:
          directMatches > 0
            ? "Matches your search terms and has useful engagement signals."
            : "Related by topic and recent audience activity.",
      };
    })
    .filter((item) => item.score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function tokenize(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .split(/[^a-z0-9#]+/)
    .filter((word) => word.length > 2)
    .slice(0, 24);
}

function buildRecommendationReason(post, matchScore, engagement) {
  if (matchScore > 0) return "Strong match for the current topic with useful creator signals.";
  if (engagement > 50) return "Audience activity suggests this post is worth seeing.";
  if ((post.tags || []).length) return "Clear tags make this post easier to discover.";
  return "Fresh creator content that may help you find a new angle.";
}

export function heuristicAudienceSimulation(text) {
  const plain = stripHtml(text);
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  const hasQuestion = /\?/.test(plain);
  const hasHowTo = /\b(how|guide|steps|tips|practical)\b/i.test(plain);
  const hasData = /\b(data|research|analysis|metrics|framework)\b/i.test(plain);
  const hasStory = /\b(i|we|story|learned|experience|mistake)\b/i.test(plain);

  return {
    originalityScore: Math.min(
      92,
      44 + (hasHowTo ? 14 : 0) + (hasData ? 14 : 0) + (hasStory ? 10 : 0) + Math.min(20, Math.floor(wordCount / 35))
    ),
    likelyComments: hasQuestion
      ? "Readers are likely to answer the closing question if the post is shared with a specific audience."
      : "Comments may be low unless you add a direct question or opinion prompt.",
    audienceTwins: [
      {
        name: "Busy creator",
        reaction: hasHowTo ? "Would save this for later because it feels practical." : "May skim unless the first paragraph promises a clear result.",
        improvement: "Add a direct takeaway in the first 2 lines.",
      },
      {
        name: "Beginner",
        reaction: wordCount > 500 ? "May feel the post is detailed but slightly heavy." : "Can understand the post if jargon stays low.",
        improvement: "Add one short example after each major point.",
      },
      {
        name: "Skeptic",
        reaction: hasData ? "Will trust it more because it sounds evidence-led." : "May want proof, examples, or a stronger reason to believe it.",
        improvement: "Add one metric, comparison, or concrete before/after.",
      },
    ],
    hiddenRisk: wordCount < 180 ? "The idea may feel too thin to be memorable." : "The structure is usable; make sure the hook is specific.",
    bestNextMove: hasQuestion ? "Strengthen the opening hook." : "Add a closing question that asks for a specific response.",
  };
}
