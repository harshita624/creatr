"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Star, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  features,
  platformTabs,
  socialProofStats,
  testimonials,
} from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const Home = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 text-gray-800 overflow-hidden relative">
      {/* Animated gradient background - Light version */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-100/30 via-fuchsia-100/20 to-sky-100/30 animate-pulse"></div>

      {/* Background patterns */}
      <div className="fixed inset-0 bg-dots-pattern opacity-30"></div>

      {/* Dynamic cursor effect - Colorful */}
      <div
        className="fixed w-96 h-96 bg-gradient-to-r from-violet-300/20 via-fuchsia-300/20 to-pink-300/20 rounded-full blur-3xl pointer-events-none z-0"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          transition: "all 0.3s ease-out",
        }}
      ></div>

      {/* Hero Section */}
      <section className="relative z-10 mt-48 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-7xl lg:text-8xl font-black leading-none tracking-tight">
                <span className="block font-black text-gray-900">Create.</span>
                <span className="block font-light italic bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Publish.
                </span>
                <span className="block font-black bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                  Grow.
                </span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium leading-relaxed max-w-2xl md:max-w-none">
                The creator platform that turns your ideas into{" "}
                <span className="text-violet-600 font-bold">
                  engaging content
                </span>{" "}
                and helps you build a thriving creator business.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
              <Link href="/dashboard">
                <Button
                  size="xl"
                  className="rounded-2xl w-full sm:w-auto bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-lg shadow-violet-300 hover:shadow-xl hover:shadow-fuchsia-300 transition-all duration-300 font-bold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Creating for Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/feed">
                <Button
                  variant="outline"
                  size="xl"
                  className="rounded-2xl w-full sm:w-auto border-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 font-semibold"
                >
                  Explore the Feed
                </Button>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 sm:gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[
                    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
                    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
                  ].map((src, i) => (
                    <div key={i} className="relative w-6 h-6 sm:w-8 sm:h-8 ring-2 ring-white">
                      <Image
                        src={src}
                        alt={`Creator ${i + 1}`}
                        fill
                        className="rounded-full object-cover"
                        sizes="32px"
                      />
                    </div>
                  ))}
                </div>
                <span className="font-semibold">10k+ creators</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 sm:w-4 sm:h-4 fill-amber-400 text-amber-400"
                  />
                ))}
                <span className="ml-1 font-semibold">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Interactive image */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 rounded-3xl blur-2xl opacity-30"></div>
            <Image
              src="/banner.png"
              alt="Platform Banner"
              width={500}
              height={700}
              className="w-full h-auto object-contain relative z-10 rounded-3xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="relative mt-14 z-10 py-16 sm:py-24 px-4 sm:px-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              Everything you need
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 font-medium">
              From writing assistance to advanced analytics,
              we&apos;ve built the complete toolkit for modern creators.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-xl border-2 border-violet-100 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-200 rounded-3xl"
              >
                <CardContent className="p-6 sm:p-8">
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                  >
                    <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl mb-3 sm:mb-4 text-gray-900 font-bold">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600 font-medium">
                    {feature.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Showcase */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              How it works
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Three powerful modules working together to supercharge your
              content creation.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <div className="space-y-4">
                {platformTabs.map((tab, index) => (
                  <Button
                    key={index}
                    variant={activeTab === index ? "default" : "ghost"}
                    onClick={() => setActiveTab(index)}
                    className={`w-full justify-start h-auto p-6 rounded-2xl transition-all ${
                      activeTab === index
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-300"
                        : "hover:bg-violet-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          activeTab === index
                            ? "bg-white/20"
                            : "bg-violet-100"
                        }`}
                      >
                        <tab.icon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-lg">{tab.title}</h3>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="lg:w-2/3">
              <Card className="bg-white/80 backdrop-blur-xl border-2 border-violet-200 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 font-bold">
                    {platformTabs[activeTab].title}
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600 font-medium">
                    {platformTabs[activeTab].description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {platformTabs[activeTab].features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-12 sm:mb-16 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
            Loved by creators worldwide
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-8">
            {socialProofStats.map((stat, index) => {
              const gradients = [
                'from-violet-400 to-fuchsia-500',
                'from-sky-400 to-cyan-500',
                'from-pink-400 to-rose-500',
                'from-emerald-400 to-teal-500'
              ];
              return (
                <div key={index} className="text-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br ${gradients[index]} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg`}>
                    <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                    {stat.metric}
                  </div>
                  <div className="text-gray-600 text-base sm:text-lg font-semibold">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-6 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
              What creators say 🎉
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-xl border-2 border-violet-100 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-200 rounded-3xl"
              >
                <CardContent className="p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="mb-6 leading-relaxed text-gray-700 font-medium">
                    &quot;{testimonial.content}&quot;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 ring-2 ring-violet-300 rounded-full">
                      <Image
                        src={`https://images.unsplash.com/photo-${testimonial.imageId}?w=100&h=100&fit=crop&crop=face`}
                        alt={testimonial.name}
                        fill
                        className="rounded-full object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {testimonial.name}
                      </div>
                      <div className="text-gray-600 text-sm font-medium">
                        {testimonial.role}
                      </div>
                      <Badge className="mt-1 bg-violet-100 text-violet-700 border-0">
                        {testimonial.company}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 sm:mb-8 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
            Ready to create?
          </h2>
          <p className="text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto font-medium">
            Join thousands of creators who are already building their audience
            and growing their business with CreateK.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/dashboard">
              <Button
                size="xl"
                className="rounded-2xl w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600 text-white shadow-lg shadow-violet-300 hover:shadow-xl hover:shadow-fuchsia-300 font-bold"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Start Your Journey
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/feed">
              <Button
                variant="outline"
                size="xl"
                className="rounded-2xl w-full border-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 font-semibold"
              >
                Explore the Feed
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-violet-200 py-8 px-4 sm:px-6 bg-white/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 font-medium">
            Made by {""}
            <span className="font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Harshita</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
