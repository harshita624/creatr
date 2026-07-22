import {
  Users,
  BarChart3,
  Mail,
  PenTool,
  Eye,
  Calendar,
  Shield,
  Target,
  TrendingUp,
  Settings,
  Search,
  ImageIcon,
} from "lucide-react";

export const features = [
  {
    icon: PenTool,
    title: "Writing Assistant",
    desc: "Generate compelling titles, refine content, and optimize SEO with smart suggestions.",
    color: "from-purple-500 to-blue-500",
  },
  {
    icon: Users,
    title: "Community Building",
    desc: "Grow your audience through interactive tools like comments, followers, and engagement insights.",
    color: "from-green-500 to-yellow-500",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    desc: "Monitor your performance with detailed metrics on views, engagement, and audience behavior.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Calendar,
    title: "Content Scheduling",
    desc: "Plan, queue, and automatically publish content with seamless real-time scheduling.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: ImageIcon,
    title: "Image Transformations",
    desc: "Enhance visuals with background removal, smart cropping, quality improvements and text overlays.",
    color: "from-red-500 to-purple-500",
  },
  {
    icon: Search,
    title: "Content Discovery",
    desc: "Find trending topics and discover top creators with a personalized recommendation feed.",
    color: "from-emerald-500 to-green-500",
  },
];

export const socialProofStats = [
  { metric: "50K+", label: "Active Creators", icon: Users },
  { metric: "2M+", label: "Published Posts", icon: PenTool },
  { metric: "10M+", label: "Monthly Readers", icon: Eye },
  { metric: "99.9%", label: "Uptime", icon: Shield },
];

export const testimonials = [
  {
    name: "Sarah Chen",
    role: "Tech Blogger",
    company: "@TechInsights",
    imageId: "1580489944761-15a19d654956",
    content:
      "Creatr has completely elevated my workflow. The writing tools save me hours while improving the quality of my content.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Newsletter Creator",
    company: "@MarketingWeekly",
    imageId: "1507003211169-0a1dd7228f2d",
    content:
      "The email tools are unmatched. My subscriber count skyrocketed by 300% in just a few months.",
    rating: 5,
  },
  {
    name: "Elena Rodriguez",
    role: "Content Strategist",
    company: "@CreativeSpace",
    imageId: "1544005313-94ddf0286df2",
    content:
      "The analytics are a game-changer. I finally understand what resonates with my audience and why.",
    rating: 5,
  },
];

export const platformTabs = [
  {
    title: "Content Creation",
    icon: PenTool,
    description:
      "Creation tools designed to help you craft engaging, high-quality content faster.",
    features: [
      "Intelligent title generation",
      "Content enhancement",
      "SEO-focused recommendations",
      "Built-in plagiarism detection",
    ],
  },
  {
    title: "Audience Growth",
    icon: TrendingUp,
    description:
      "Grow your reach with advanced analytics and community-focused engagement tools.",
    features: [
      "Follower and audience analytics",
      "Engagement breakdowns",
      "Community insights dashboard",
      "Data-driven growth suggestions",
    ],
  },
  {
    title: "Content Management",
    icon: Settings,
    description:
      "Effortlessly organize, schedule, and monitor your content performance in one place.",
    features: [
      "Draft and workspace system",
      "Automated scheduling",
      "Performance analytics",
      "Centralized media management",
    ],
  },
];
