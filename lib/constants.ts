export const STYLE_PRESETS = [
  {
    id: "chinese-ink",
    name: "水墨风格",
    description: "传统中国水墨画效果",
    thumbnail: "/assets/presets/chinese-ink.jpg",
    promptTemplate:
      "{inputImage} 转换为传统中国水墨画风格，保留原始构图但使用黑白水墨笔触，添加适当的留白和题诗空间",
    negativePrompt: "西方油画风格, 彩色, 现代艺术, 照片写实",
    apiParams: {
      style: "chinese_ink",
      steps: 30,
      cfg_scale: 7,
    },
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "霓虹灯光与未来都市风格",
    thumbnail: "/assets/presets/cyberpunk.jpg",
    promptTemplate:
      "{inputImage} 转换为赛博朋克风格，添加霓虹灯光效果，高科技都市背景，蓝粉色调，雨天街道反射",
    negativePrompt: "自然光, 白天, 乡村场景, 历史风格",
    apiParams: {
      style: "cyberpunk",
      steps: 25,
      cfg_scale: 8,
    },
  },
  {
    id: "oil-painting",
    name: "古典油画",
    description: "欧洲古典油画质感",
    thumbnail: "/assets/presets/oil-painting.jpg",
    promptTemplate:
      "{inputImage} 转换为17世纪欧洲古典油画风格，厚重的油彩笔触，暖色调，伦勃朗式光影效果",
    negativePrompt: "扁平插画, 现代艺术, 照片写实, 水墨风格",
    apiParams: {
      style: "oil_painting",
      steps: 40,
      cfg_scale: 6,
    },
  },
  // Add more presets...
] as const;
