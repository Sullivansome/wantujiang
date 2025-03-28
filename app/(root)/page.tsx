import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">AI 图片魔法生成</h1>
        <p className="text-muted-foreground mb-6 text-lg">
          无需复杂指令，一键转换你的图片风格
        </p>
        <Button asChild size="lg">
          <Link href="/generate">立即尝试</Link>
        </Button>
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">简单三步</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { icon: "📤", title: "上传图片", desc: "选择你的原始图片" },
            { icon: "🎨", title: "选择风格", desc: "从预设风格中挑选" },
            { icon: "✨", title: "生成作品", desc: "AI 自动转换" },
          ].map((step) => (
            <div key={step.title} className="text-center">
              <div className="mb-2 text-4xl">{step.icon}</div>
              <h3 className="mb-2 text-xl font-medium">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">热门风格</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { name: "吉卜力", image: "/gallery/chinese-style.jpg" },
            { name: "哆啦A梦", image: "/gallery/cartoon.jpg" },
            { name: "油画", image: "/gallery/oil-painting.jpg" },
            { name: "赛博朋克", image: "/gallery/cyberpunk.jpg" },
          ].map((style) => (
            <div key={style.name} className="group cursor-pointer">
              <div className="mb-2 aspect-square overflow-hidden rounded-lg">
                <Image
                  src={style.image}
                  alt={style.name}
                  width={300}
                  height={300}
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <p className="text-center font-medium">{style.name}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
