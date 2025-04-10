"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageComparisonSlider } from "@/components/ImageComparisonSlider";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// Simulate fetching gallery images (in a real app, we would fetch these dynamically)
const GALLERY_CATEGORIES = [
  {
    name: "row1",
    images: Array.from(
      { length: 10 },
      (_, i) => `/gallery/row1/image${i + 1}.jpg`,
    ),
  },
  {
    name: "row2",
    images: Array.from(
      { length: 8 },
      (_, i) => `/gallery/row2/image${i + 1}.jpg`,
    ),
  },
  {
    name: "row3",
    images: Array.from(
      { length: 12 },
      (_, i) => `/gallery/row3/image${i + 1}.jpg`,
    ),
  },
];

// Style comparisons
const STYLE_COMPARISONS = [
  {
    name: "吉卜力风格",
    before: "/gallery/ghibli/0.jpg",
    after: "/gallery/ghibli/1.png",
    description: "将真实照片转换为吉卜力工作室的动画风格",
  },
  {
    name: "油画效果",
    before: "/gallery/oilpaint/0.jpg",
    after: "/gallery/oilpaint/1.jpg",
    description: "将风景照片转换为印象派风格的油画",
  },
  {
    name: "瑞克和莫蒂",
    before: "/gallery/rickandmorty/0.jpg",
    after: "/gallery/rickandmorty/2.png",
    description: "进入瑞克和莫蒂的宇宙",
  },
  {
    name: "表情包",
    before: "/gallery/meme/0.jpg",
    after: "/gallery/meme/1.jpg",
    description: "为常用的表情包注入新活力",
  },
];

// Testimonials
// const TESTIMONIALS = [
//   {
//     // name: "小明",
//     // avatar: "/avatars/user1.png",
//     content:
//       "一键将我的旅行照片变成吉卜力风格画作，太神奇了！朋友们都在问我用了什么魔法。",
//     // role: "摄影爱好者",
//   },
//   {
//     // name: "小红",
//     // avatar: "/avatars/user2.png",
//     content:
//       "用这个给我女儿做了一套动漫风格的表情包，她超级喜欢！操作简单又快速。",
//     // role: "家长",
//   },
//   {
//     // name: "李华",
//     // avatar: "/avatars/user3.png",
//     content: "我用它制作了一份特别的生日礼物，给了外国朋友一个惊喜",
//     // role: "UI设计师",
//   },
// ];

export default function Home() {
  const [activeComparisonTab, setActiveComparisonTab] = useState("吉卜力风格");
  const [allGalleryImages, setAllGalleryImages] = useState<string[]>([]);

  // Refs for the waterfall rows
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const row3Ref = useRef<HTMLDivElement>(null);

  // Prepare all gallery images for the waterfall
  useEffect(() => {
    const images = GALLERY_CATEGORIES.flatMap((category) => category.images);
    // Shuffle the images for variety
    const shuffled = [...images].sort(() => 0.5 - Math.random());
    setAllGalleryImages(shuffled);
  }, []);

  // Animate the waterfall rows
  useEffect(() => {
    if (!allGalleryImages.length) return;

    const animate = (
      ref: React.RefObject<HTMLDivElement | null>,
      speed: number,
      reverse = false,
    ) => {
      if (!ref.current) return;

      const width = ref.current.scrollWidth;
      const duration = width / speed;

      ref.current.animate(
        [
          { transform: reverse ? "translateX(-50%)" : "translateX(0)" },
          { transform: reverse ? "translateX(0)" : "translateX(-50%)" },
        ],
        {
          duration: duration * 1000,
          iterations: Infinity,
        },
      );
    };

    // Animate each row at different speeds
    animate(row1Ref, 30); // slow
    animate(row2Ref, 40, true); // medium, reverse
    animate(row3Ref, 25); // fast
  }, [allGalleryImages]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="from-primary/10 to-background relative bg-gradient-to-b py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-4xl leading-tight font-extrabold tracking-tighter sm:text-5xl md:text-6xl">
              AI{" "}
              <span className="from-primary bg-gradient-to-r to-purple-500 bg-clip-text text-transparent">
                魔法重绘
              </span>{" "}
              您的图片
            </h1>
            <p className="text-muted-foreground mb-8 text-lg md:text-xl">
              无需复杂指令，只需上传图片，选择风格，一键转换
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="text-md relative z-10 h-12 px-8 shadow-lg"
              >
                <Link href="/generate" legacyBehavior={false}>
                  立即免费体验
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-md relative z-10 h-12 px-8"
              >
                <Link href="#gallery" legacyBehavior={false}>
                  浏览作品集
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="from-background absolute right-0 bottom-0 left-0 h-40 bg-gradient-to-t to-transparent" />
        <div className="bg-primary/20 absolute top-1/4 left-[10%] h-64 w-64 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-[10%] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      </section>

      {/* Waterfall Gallery */}
      <section className="overflow-hidden py-20" id="gallery">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">创作灵感</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            探索用户的惊艳作品，激发您的创意灵感
          </p>
        </div>

        {allGalleryImages.length > 0 && (
          <div className="gallery-waterfall mt-10">
            {/* Row 1 - Moving right to left */}
            <div className="relative mb-4 overflow-hidden py-2">
              <div ref={row1Ref} className="flex w-max">
                {[
                  ...allGalleryImages.slice(0, 10),
                  ...allGalleryImages.slice(0, 10),
                ].map((img, idx) => (
                  <div
                    key={`row1-${idx}`}
                    className="mx-2 h-40 w-60 flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={img}
                      alt={`Gallery image ${idx}`}
                      width={240}
                      height={160}
                      className="h-full w-full object-cover transition-transform hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2 - Moving left to right */}
            <div className="relative mb-4 overflow-hidden py-2">
              <div ref={row2Ref} className="flex w-max">
                {[
                  ...allGalleryImages.slice(10, 20),
                  ...allGalleryImages.slice(10, 20),
                ].map((img, idx) => (
                  <div
                    key={`row2-${idx}`}
                    className="mx-2 h-64 w-48 flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={img}
                      alt={`Gallery image ${idx}`}
                      width={192}
                      height={256}
                      className="h-full w-full object-cover transition-transform hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Row 3 - Moving right to left (faster) */}
            <div className="relative overflow-hidden py-2">
              <div ref={row3Ref} className="flex w-max">
                {[
                  ...allGalleryImages.slice(20, 30),
                  ...allGalleryImages.slice(20, 30),
                ].map((img, idx) => (
                  <div
                    key={`row3-${idx}`}
                    className="mx-2 h-52 w-52 flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={img}
                      alt={`Gallery image ${idx}`}
                      width={208}
                      height={208}
                      className="h-full w-full object-cover transition-transform hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            简单三步，轻松转换
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-lg">
            通过我们简化的流程，任何人都能创造专业级艺术效果
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: "📤",
                title: "上传图片",
                desc: "选择并上传你想要转换的照片或图片",
              },
              {
                icon: "🎨",
                title: "选择风格",
                desc: "从多种精心设计的艺术风格中挑选你喜欢的",
              },
              {
                icon: "✨",
                title: "生成作品",
                desc: "AI自动分析并转换你的图片，立即获得惊艳效果",
              },
            ].map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden border-none shadow-md">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="bg-primary/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl">
                      {step.icon}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Slider Section */}
      {/* Comparison Slider Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">对比效果</h2>
          <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg">
            拖动滑块查看转换前后的效果对比，感受AI的魔法力量
          </p>

          <Tabs
            defaultValue={STYLE_COMPARISONS[0].name}
            value={activeComparisonTab}
            onValueChange={setActiveComparisonTab}
            className="mx-auto"
          >
            <TabsList className="mb-8 grid w-full grid-cols-2 gap-2 md:grid-cols-4">
              {STYLE_COMPARISONS.map((comp) => (
                <TabsTrigger
                  key={comp.name}
                  value={comp.name}
                  className="text-sm md:text-base"
                >
                  {comp.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {STYLE_COMPARISONS.map((comp) => (
              <TabsContent
                key={comp.name}
                value={comp.name}
                className="overflow-hidden rounded-xl border shadow-sm"
              >
                <div className="flex justify-center">
                  <div className="w-full max-w-3xl">
                    <div className="aspect-[4/3] w-full">
                      <ImageComparisonSlider
                        original={comp.before}
                        generated={comp.after}
                        className="rounded-t-xl"
                      />
                    </div>
                    <div className="bg-background p-4 text-center">
                      <p className="text-muted-foreground text-sm md:text-base">
                        {comp.description}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className="bg-muted py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">用户评价</h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-2xl text-lg">
            来自真实用户的使用体验和反馈
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, idx) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="h-12 w-12 overflow-hidden rounded-full">
                        <Image
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold">{testimonial.name}</h4>
                        <p className="text-muted-foreground text-sm">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground flex-grow text-left">
                      {testimonial.content}
                    </p>
                    <div className="mt-4 flex text-amber-500">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <svg
                            key={i}
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
              准备好了吗？
            </h2>
            <p className="mb-8 text-lg opacity-90">
              立即体验AI魔法，将照片转变为独特艺术品
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-md h-12 px-10 shadow-lg"
            >
              <Link href="/generate">立即开始创作</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
