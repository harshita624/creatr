# trends_backend.py - Clean Real-Time Trends API
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import numpy as np
from collections import Counter
from datetime import datetime
import re
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import quote

app = Flask(__name__)
CORS(app)

MAX_TREND_AGE_HOURS = 24

def strip_html(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', text or '')).strip()

def extract_keywords(text, limit=8):
    stop_words = {
        'about', 'after', 'again', 'also', 'because', 'before', 'being', 'could',
        'every', 'from', 'have', 'into', 'more', 'most', 'other', 'should',
        'that', 'their', 'there', 'these', 'this', 'those', 'with', 'would', 'your'
    }
    words = re.findall(r'\b[a-z][a-z0-9-]{3,}\b', text.lower())
    counts = Counter(word for word in words if word not in stop_words)
    return [word for word, _ in counts.most_common(limit)]

def estimate_readability(text):
    words = re.findall(r'\b\w+\b', text)
    if not words:
        return 0
    sentences = [item for item in re.split(r'[.!?]+', text) if item.strip()]
    avg_word_length = sum(len(word) for word in words) / len(words)
    avg_sentence_length = len(words) / max(1, len(sentences))
    return max(20, min(95, round(100 - avg_word_length * 5 - avg_sentence_length * 0.6)))

def build_content_suggestions(text):
    suggestions = []
    words = re.findall(r'\b\w+\b', text)
    if len(words) < 300:
        suggestions.append('Expand the post with examples, context, or a short checklist before publishing.')
    if '?' not in text:
        suggestions.append('Add one direct question near the end to invite comments.')
    if not re.search(r'\b(comment|share|try|tell|follow|subscribe)\b', text, re.I):
        suggestions.append('Add a clear reader action so the post has a stronger finish.')
    if len(suggestions) < 3:
        suggestions.append('Turn the strongest point into a hook for a reel or carousel.')
    return suggestions[:4]

@app.route('/enhance-post', methods=['POST'])
def enhance_post():
    """Analyze creator post text with local NLP heuristics."""
    payload = request.get_json(silent=True) or {}
    text = strip_html(payload.get('text', ''))

    if not text:
        return jsonify({'error': 'No text provided'}), 400

    words = re.findall(r'\b\w+\b', text)
    keywords = extract_keywords(text)

    return jsonify({
        'word_count': len(words),
        'readability_score': estimate_readability(text),
        'suggested_hashtags': [f"#{word.replace('-', '')}" for word in keywords[:5]] or ['#creator', '#content'],
        'top_keywords': keywords,
        'suggestions': build_content_suggestions(text),
        'source': 'local_nlp_service',
        'timestamp': datetime.now().isoformat()
    })

class TrendsEngine:
    def __init__(self):
        self.categories = {
            'technology': ['technology', 'programming', 'Apple', 'gadgets'],
            'business': ['business', 'entrepreneur', 'stocks', 'startups'],
            'sports': ['sports', 'nba', 'soccer', 'nfl'],
            'entertainment': ['movies', 'television', 'gaming', 'netflix'],
            'health': ['fitness', 'nutrition', 'running', 'yoga'],
            'lifestyle': ['LifeProTips', 'cooking', 'travel', 'photography'],
            'science': ['science', 'space', 'Physics', 'biology'],
            'news': ['worldnews', 'news', 'UpliftingNews'],
            'food': ['food', 'cooking', 'recipes', 'Baking'],
            'music': ['Music', 'hiphopheads', 'listentothis']
        }

    def scrape_reddit(self, category, limit=40):
        """Fetch live trend items from Reddit, then Google News if Reddit blocks the request."""
        posts = []
        subreddits = self.categories.get(category, ['all'])
        now = datetime.now().timestamp()
        
        for subreddit in subreddits[:3]:
            try:
                url = f'https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}'
                response = requests.get(
                    url,
                    headers={'User-Agent': 'Mozilla/5.0 CreatorSocialTrendBot/1.0'},
                    timeout=8
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for child in data['data']['children']:
                        post = child['data']
                        created_utc = float(post['created_utc'])
                        age_hours = (now - created_utc) / 3600
                        if age_hours > MAX_TREND_AGE_HOURS:
                            continue

                        posts.append({
                            'title': post['title'],
                            'url': f"https://reddit.com{post['permalink']}",
                            'score': int(post['score']),
                            'upvote_ratio': float(post.get('upvote_ratio', 0)),
                            'num_comments': int(post['num_comments']),
                            'created_utc': created_utc,
                            'subreddit': str(post['subreddit']),
                            'is_video': post.get('is_video', False)
                        })
            except Exception as e:
                print(f"Error fetching r/{subreddit}: {e}")
                continue

        if posts:
            return posts[:limit]

        return self.scrape_google_news(category, limit)

    def scrape_google_news(self, category, limit=40):
        """Fetch live category news when Reddit blocks anonymous JSON requests."""
        posts = []
        seen = set()
        queries = self.google_news_queries(category)

        for raw_query in queries:
            if len(posts) >= limit:
                break

            query = quote(raw_query)
            url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

            try:
                response = requests.get(
                    url,
                    headers={'User-Agent': 'Mozilla/5.0 CreatorSocialTrendBot/1.0'},
                    timeout=10
                )
                response.raise_for_status()
                root = ET.fromstring(response.text)

                for index, item in enumerate(root.findall('./channel/item')):
                    title = (item.findtext('title') or '').strip()
                    link = (item.findtext('link') or '').strip()
                    published = item.findtext('pubDate')
                    created_utc = datetime.now().timestamp()

                    if published:
                        try:
                            created_utc = parsedate_to_datetime(published).timestamp()
                        except Exception:
                            created_utc = datetime.now().timestamp()

                    age_hours = (datetime.now().timestamp() - created_utc) / 3600
                    key = re.sub(r'\W+', '', title.lower())[:120]
                    if not title or key in seen or age_hours > MAX_TREND_AGE_HOURS:
                        continue

                    seen.add(key)
                    posts.append({
                        'title': title,
                        'url': link,
                        'score': 0,
                        'rank': index + 1,
                        'upvote_ratio': 1.0,
                        'num_comments': 0,
                        'created_utc': created_utc,
                        'subreddit': 'Google News',
                        'is_video': False,
                        'source': 'google_news'
                    })
                    if len(posts) >= limit:
                        break
            except Exception as e:
                print(f"Error fetching Google News query '{raw_query}': {e}")

        return posts

    def google_news_queries(self, category):
        """Broad, category-specific queries. Keep creator framing out of the fetch step."""
        queries = {
            'technology': [
                'technology OR AI OR software OR gadgets when:1d',
                'latest technology news when:1d',
            ],
            'business': [
                'business OR markets OR startups OR economy when:1d',
                'latest business news when:1d',
            ],
            'sports': [
                'sports OR football OR cricket OR NBA OR soccer when:1d',
                'latest sports news when:1d',
            ],
            'entertainment': [
                'entertainment OR movies OR streaming OR celebrity when:1d',
                'latest entertainment news when:1d',
            ],
            'health': [
                'health OR fitness OR medicine OR wellness when:1d',
                'latest health news when:1d',
            ],
            'lifestyle': [
                'lifestyle OR travel OR fashion OR home when:1d',
                'latest lifestyle news when:1d',
            ],
            'science': [
                'science OR space OR research OR climate when:1d',
                'latest science news when:1d',
            ],
            'news': [
                'breaking news OR world news OR politics when:1d',
                'latest news when:1d',
            ],
            'food': [
                'food OR restaurants OR recipes OR cooking when:1d',
                'latest food news when:1d',
            ],
            'music': [
                'music OR album OR concert OR artist when:1d',
                'latest music news when:1d',
            ],
        }

        return queries.get(category, [f'{category} news when:1d', f'latest {category} news when:1d'])

    def analyze_trends(self, posts, category):
        """Analyze posts and generate insights"""
        posts = [
            post for post in posts
            if (datetime.now().timestamp() - post['created_utc']) / 3600 <= MAX_TREND_AGE_HOURS
        ]

        if not posts:
            return self.get_empty_response(category)
        
        # Calculate virality scores
        sources = []
        for post in posts:
            hours_old = (datetime.now().timestamp() - post['created_utc']) / 3600
            time_decay = np.exp(-hours_old / 24)
            engagement = post['score'] + (post['num_comments'] * 3)
            rank_score = max(10, 120 - post.get('rank', 1) * 4)
            virality = (engagement or rank_score) * time_decay * post['upvote_ratio']
            
            sources.append({
                'title': post['title'],
                'reddit_discussion': post['url'],
                'subreddit': post['subreddit'] if post.get('source') == 'google_news' else f"r/{post['subreddit']}",
                'engagement': {
                    'upvotes': post['score'],
                    'comments': post['num_comments'],
                    'ratio': post['upvote_ratio']
                },
                'virality_score': float(virality),
                'age_hours': round(hours_old, 1),
                'content_angle': self.get_content_angle(post['title'])
            })
        
        # Sort by virality
        sources = sorted(sources, key=lambda x: x['virality_score'], reverse=True)
        
        # Extract patterns
        patterns = self.extract_patterns(posts)
        
        # Generate content ideas
        blueprints = self.generate_ideas(sources, patterns, category)
        
        # Calculate stats
        stats = {
            'total_sources': len(posts),
            'avg_engagement': float(np.mean([p['score'] for p in posts])),
            'best_posting_time': self.find_best_time(posts),
            'top_format': patterns.get('top_format', 'Tutorial')
        }
        
        return {
            'category': category,
            'research_sources': sources[:20],
            'content_blueprints': blueprints,
            'viral_patterns': patterns,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        }

    def get_content_angle(self, title):
        """Determine content type"""
        title_lower = title.lower()
        if any(word in title_lower for word in ['how', 'guide', 'tutorial']):
            return 'Tutorial'
        elif '?' in title:
            return 'Q&A'
        elif any(word in title_lower for word in ['new', 'announces', 'breaking']):
            return 'News'
        elif any(word in title_lower for word in ['review', 'vs', 'comparison']):
            return 'Review'
        else:
            return 'Discussion'

    def extract_patterns(self, posts):
        """Extract trending patterns"""
        formats = Counter()
        words = Counter()
        
        for post in posts:
            title = post['title'].lower()
            
            # Detect formats
            if title.startswith('how'):
                formats['Tutorial'] += post['score']
            if any(str(i) in title for i in range(1, 11)):
                formats['Listicle'] += post['score']
            if '?' in title:
                formats['Question'] += post['score']
            if post['is_video']:
                formats['Video'] += post['score']
            
            # Extract keywords
            clean_words = re.findall(r'\b[a-z]{4,}\b', title)
            for word in clean_words:
                words[word] += 1
        
        return {
            'top_format': formats.most_common(1)[0][0] if formats else 'Tutorial',
            'trending_words': [w for w, c in words.most_common(12)],
            'use_questions': sum(1 for p in posts if '?' in p['title']) > len(posts) * 0.3,
            'use_numbers': sum(1 for p in posts if any(c.isdigit() for c in p['title'])) > len(posts) * 0.4
        }

    def generate_ideas(self, sources, patterns, category):
        """Generate content suggestions"""
        if not sources:
            return []

        platforms = [
            ('YouTube', 'Explainer video (6-10 min)'),
            ('Twitter/X', 'Thread (8-12 posts)'),
            ('Blog', 'Context article'),
            ('Carousel', 'Swipeable breakdown'),
        ]
        ideas = []

        for index, source in enumerate(sources[:4]):
            platform, content_format = platforms[index % len(platforms)]
            title = re.sub(r'\s+-\s+[^-]{2,40}$', '', source.get('title', '')).strip()
            angle = source.get('content_angle', 'Discussion')
            score = source.get('engagement', {}).get('upvotes', 0) + source.get('engagement', {}).get('comments', 0) * 4

            if platform == 'Twitter/X':
                idea_title = f"Start a thread: {title}"
            elif platform == 'Carousel':
                idea_title = f"Break down: {title}"
            else:
                idea_title = f"{angle}: {title}"

            ideas.append({
                'platform': platform,
                'title': idea_title,
                'format': content_format,
                'estimated_performance': {
                    'views': self.estimate_reach(score),
                    'impressions': self.estimate_reach(score),
                    'engagement_rate': 'Live signal',
                    'difficulty': 'Medium' if source.get('virality_score', 0) > 40 else 'Easy'
                }
            })

        return ideas

    def estimate_reach(self, score):
        """Estimate reach from live engagement signal"""
        if score >= 20000:
            return '200K+'
        if score >= 5000:
            return '50K-200K'
        if score >= 1000:
            return '10K-50K'
        return 'New'

    def find_best_time(self, posts):
        """Find optimal posting time"""
        hour_scores = {}
        for post in posts:
            dt = datetime.fromtimestamp(post['created_utc'])
            hour = dt.hour
            hour_scores[hour] = hour_scores.get(hour, 0) + post['score']
        
        if hour_scores:
            best = max(hour_scores, key=hour_scores.get)
            return f"{best}:00-{(best+2)%24}:00"
        return "9:00-11:00"

    def get_empty_response(self, category):
        """Fallback when no data"""
        return {
            'category': category,
            'research_sources': [],
            'content_blueprints': [],
            'viral_patterns': {
                'top_format': 'Tutorial',
                'trending_words': [],
                'use_questions': False,
                'use_numbers': False
            },
            'stats': {
                'total_sources': 0,
                'avg_engagement': 0,
                'best_posting_time': '9:00-11:00',
                'top_format': 'Tutorial'
            },
            'timestamp': datetime.now().isoformat()
        }

    def get_fallback_response(self, category):
        """Useful starter trend data when live sources return nothing"""
        titles_by_category = {
            'technology': [
                'New creator tools are changing how people plan and publish content',
                'Simple workflows are winning over complicated productivity stacks',
                'People want plain-English explainers for fast-moving tech news',
            ],
            'business': [
                'Small creators are building services around niche expertise',
                'Personal brands are using transparent revenue breakdowns to build trust',
                'Operators are sharing simple systems for repeatable growth',
            ],
            'sports': [
                'Fans are responding to behind-the-scenes training stories',
                'Short match breakdowns are outperforming generic recap posts',
                'Athlete routines are turning into practical lifestyle content',
            ],
            'entertainment': [
                'Audience reactions are driving fresh angles on new releases',
                'Behind-the-scenes details are becoming easy shareable explainers',
                'Fans want quick guides before deciding what to watch next',
            ],
            'health': [
                'Simple habit resets are resonating more than extreme routines',
                'Beginner-friendly fitness plans are getting stronger engagement',
                'People want practical nutrition advice without confusing jargon',
            ],
            'lifestyle': [
                'Low-effort routines are becoming strong everyday content',
                'Travel and home posts work better when they include real costs',
                'Personal lessons are outperforming polished generic advice',
            ],
            'science': [
                'Plain-English science explainers are useful for broad audiences',
                'Space and climate stories work well with visual summaries',
                'Readers want practical implications, not only discoveries',
            ],
            'news': [
                'Readers want context posts that explain why a story matters',
                'Timeline-style updates make complex news easier to follow',
                'Balanced explainers are more useful than reaction-only posts',
            ],
            'food': [
                'Budget meals and simple prep ideas are getting steady attention',
                'Short recipe formats work when they include substitutions',
                'Creators are turning food mistakes into helpful teaching posts',
            ],
            'music': [
                'Song breakdowns and artist stories are strong discovery hooks',
                'Fans respond to playlist ideas tied to moods and routines',
                'Creators are using nostalgia angles to start conversations',
            ],
        }
        starter_titles = [
            f'What changed in {category} this week and why creators should care',
            f'Beginner mistakes in {category} that audiences keep asking about',
            f'Quick wins for creators covering {category} without a large team',
            f'Why {category} audiences are saving practical checklist-style posts',
            f'How to turn one {category} update into reels, carousels, and livestream topics',
        ]
        titles = (titles_by_category.get(category, titles_by_category['technology']) + starter_titles)[:8]
        words = self.extract_fallback_words(category, titles)
        sources = []

        for index, title in enumerate(titles):
            sources.append({
                'title': title,
                'reddit_discussion': '',
                'subreddit': category,
                'engagement': {
                    'upvotes': 1800 - index * 320,
                    'comments': 120 - index * 24,
                    'ratio': 0.91 - index * 0.03
                },
                'virality_score': float(78 - index * 7),
                'age_hours': 3 + index * 4,
                'content_angle': self.get_content_angle(title)
            })

        patterns = {
            'top_format': 'Short guide',
            'trending_words': words,
            'use_questions': True,
            'use_numbers': True
        }

        return {
            'category': category,
            'research_sources': sources,
            'content_blueprints': self.generate_ideas(sources, patterns, category),
            'viral_patterns': patterns,
            'stats': {
                'total_sources': len(sources),
                'avg_engagement': float(np.mean([item['engagement']['upvotes'] for item in sources])),
                'best_posting_time': '18:00-20:00',
                'top_format': patterns['top_format']
            },
            'timestamp': datetime.now().isoformat(),
            'fallback': True
        }

    def extract_fallback_words(self, category, titles):
        """Generate keywords from fallback titles"""
        words = Counter()
        for title in titles:
            for word in re.findall(r'\b[a-z]{4,}\b', title.lower()):
                if word not in {'that', 'with', 'into', 'they', 'when', 'over'}:
                    words[word] += 1

        common = [word for word, _ in words.most_common(8)]
        return [category] + common[:8]

# Initialize
engine = TrendsEngine()

@app.route('/analyze-category/<category>', methods=['GET', 'POST'])
def analyze_category(category):
    """Get trends for category"""
    try:
        print(f"Analyzing {category}...")
        posts = engine.scrape_reddit(category, limit=40)
        if not posts:
            return jsonify({
                'error': 'No live trend data returned',
                'category': category,
                'timestamp': datetime.now().isoformat()
            }), 503
        result = engine.analyze_trends(posts, category)
        print(f"Found {len(result['research_sources'])} trends")
        return jsonify(result)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            'error': 'Trend analysis failed',
            'details': str(e),
            'category': category,
            'timestamp': datetime.now().isoformat()
        }), 503

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 60)
    print("TRENDS API - REAL-TIME CONTENT INTELLIGENCE")
    print("=" * 60)
    print("\nFeatures:")
    print("   - Real-time Reddit trend analysis")
    print("   - 10 content categories")
    print("   - Actionable content suggestions")
    print("   - Clean, minimal design")
    print("\nEndpoints:")
    print("   GET/POST /analyze-category/<category>")
    print("   GET /health")
    print("\n" + "=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
