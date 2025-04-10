export type StylePreset = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  preview: string;
};

export type StyleCategory = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  presets: StylePreset[];
};

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    id: "anime",
    name: "日本动漫",
    description: "各种日本动漫风格",
    thumbnail: "/categories/anime.png",
    presets: [
      {
        id: "MakotoShinkai",
        name: "新海诚",
        description: "新海诚动画电影风格",
        prompt: `生成3:2图片，将我的照片转换为下面这种动画风格：

      1. 极致写实的背景与环境细节：

      照片级精度： 场景描绘达到了近乎照片的逼真度，但又并非简单的照片临摹，而是带有浓厚绘画感的再创作。每一个细节，从路牌上的文字、墙壁的纹理、金属的锈迹到柏油路面的颗粒感，都经过精心绘制。

      “空气感”的营造： 画面极力表现光线穿过大气时的散射、尘埃在光束中的漂浮感，以及远景因大气透视而产生的微妙色彩和清晰度变化，营造出强烈的空间感和“空气感”。

      平凡之物的诗意化： 对日常生活中随处可见的元素，如交错的电线杆与电线、繁忙的十字路口、老旧的自动贩卖机、车站的指示牌、公寓楼的阳台等，都赋予了极高的绘制精度和美学价值，使其在平凡中透出诗意。

      2. 光影的魔法——情感与氛围的塑造者：

      戏剧性的光效运用： 光线不仅仅是照明，更是情绪的画笔。标志性的“耶稣光”（丁达尔效应）频繁出现，光束穿透云层或窗户，营造神圣、希望或奇迹感。逆光的大量使用勾勒出人物或景物的轮廓，产生剪影效果，增强唯美和神秘感。
      细腻的光影层次： 物体受光面、背光面、反光和投影都被细致描绘，层次丰富。尤其擅长表现水面、玻璃、湿润路面等对光线的复杂反射和折射，使画面充满流动感和光泽。
      时间与情绪的色彩： 不同时段的光线被赋予特定色温和情感。清晨是清冷的蓝调带着微暖的曦光；午后是明亮耀眼的白光与清晰的阴影；黄昏是饱和度极高的暖橙、粉紫调，渲染出浓郁的浪漫或伤感；夜晚则是深邃的蓝与城市灯火（霓虹、车灯）的冷暖对比，营造繁华与孤独并存的氛围。
      镜头效果模拟： 经常运用镜头光晕（Lens Flare），模拟摄像机镜头对着强光源时产生的炫光效果，增加画面的真实感和梦幻感。景深（Depth of Field）效果显著，通过模糊前景或背景来突出主体，引导观众视线，并产生电影般的视觉体验。

      3. 高饱和度、高对比度的色彩哲学：

      标志性的天空蓝： 天空往往呈现出一种异常清澈、饱和度极高的蓝色（有时是带有紫色倾向的蓝），云朵的体积感和光影变化被极致刻画，极具视觉冲击力。
      鲜明而和谐的配色： 整体色彩饱和度偏高，对比强烈，但不俗艳。即使是描绘城市，也常常通过滤镜般的处理，让色彩更加鲜亮、纯净，带有一种理想化的美感。
      细腻的色彩渐变： 天空、水面等大面积色块的处理上，色彩过渡极其平滑、细腻，层次丰富，展现出高超的数字绘画技巧。

      4. 对自然现象的精妙捕捉：

      雨与雪的诗篇： 雨滴的形态、速度、打在不同物体表面的飞溅效果；雪花的晶莹剔透、飘落的轨迹、积雪的松软质感，都被描绘得淋漓尽致，并常常作为推动情节、渲染情绪的重要视觉元素。
      流动的云与风： 云的形态变幻万千，从薄如蝉翼的卷云到厚重如山的积雨云，其流动感和光影变化被生动捕捉。风吹动树叶、发丝、衣角的动态也描绘得十分细致。
      星空的璀璨： 夜空中的繁星、银河、流星等天文景象，常常以超乎现实的清晰度和亮度呈现，营造出浩瀚、神秘与浪漫的氛围。

      5. 写实背景与风格化人物的对比融合：

      人物的简洁化： 相较于背景的极致精细，人物造型遵循典型的日式动画风格，线条相对简洁，面部特征（尤其是眼睛）被适度夸张以传递情感，但与环境融合自然，并未产生强烈的割裂感。这种对比反而更能凸显环境的宏大与人物情感的细腻。
    `,
        preview: "/gallery/makotoshinkai/1.png",
      },
      {
        id: "ghibli",
        name: "宫崎骏风格",
        description: "宫崎骏风格",
        prompt:
          "Turn this image into a Studio Ghibli-style animated image. Use the soft color palette, whimsical background, and facial features inspired by Ghibli characters.",
        preview: "/gallery/ghibli/1.png",
      },
      // {
      //   id: "jojo",
      //   name: "JOJO的奇妙冒险",
      //   description: "JOJO的奇妙冒险风格",
      //   prompt: "Transform this image in the style of JoJo's Bizarre Adventure",
      //   preview: "/gallery/jojo/1.png",
      // },
      {
        id: "demonslayer",
        name: "鬼灭之刃",
        description: "鬼灭之刃动画风格",
        prompt:
          "Convert this image into the Demon Slayer (Kimetsu no Yaiba) anime style by Ufotable. Feature highly detailed character designs with distinctive eyes and hair, incorporate traditional Japanese patterns (like checkered or hemp leaf), use dynamic action lines, dramatic lighting, and replicate the blend of detailed 2D art with visually stunning CGI effects, especially for elemental powers.",
        preview: "/gallery/demonslayer/1.jpg",
      },
      {
        id: "attackontitan",
        name: "进击的巨人",
        description: "进击的巨人动画风格",
        prompt:
          "Transform this image into the Attack on Titan (Shingeki no Kyojin) anime style. Use thick, bold outlines, detailed character designs with intense expressions, a generally muted and gritty color palette (earth tones, greys), dramatic shading and lighting, and convey a sense of scale and intensity. Include elements of the Survey Corps uniform or ODM gear if appropriate.",
        preview: "/gallery/attackontitan/1.jpg",
      },
      {
        id: "onepiece",
        name: "海贼王",
        description: "海贼王动画风格",
        prompt:
          "Redraw this image in the One Piece anime style. Emphasize Eiichiro Oda's distinctive character proportions (often exaggerated or cartoony), bold outlines, vibrant colors suitable for a grand adventure, expressive and often comical facial features, and a dynamic, energetic composition.",
        preview: "/gallery/onepiece/1.jpg",
      },
      // {
      //   id: "spyxfamily",
      //   name: "间谍过家家",
      //   description: "间谍过家家动画风格",
      //   prompt: "Adapt this image into the Spy x Family anime style.",
      //   preview: "/gallery/spyxfamily/1.png",
      // },
      // {
      //   id: "dragonball",
      //   name: "龙珠",
      //   description: "龙珠Z/超动画风格",
      //   prompt:
      //     "Transform this image into the Dragon Ball Z/Super style by Akira Toriyama.",
      //   preview: "/gallery/dragonball/1.png",
      // },
      // Add more anime presets...
    ],
  },
  {
    id: "western-animation",
    name: "欧美动画",
    description: "西方动画风格",
    thumbnail: "/categories/western.png",
    presets: [
      {
        id: "rickandmorty",
        name: "瑞克和莫蒂",
        description: "瑞克和莫蒂风格",
        prompt: "Turn this image into a rick and morty style image",
        preview: "/gallery/rickandmorty/1.png",
      },
      {
        id: "hazbinhotel",
        name: "地狱旅馆",
        description: "地狱旅馆风格",
        prompt: `"Transform this image into a Hazbin Hotel style image, following these detailed steps:

Outline the Character and Background: Begin by creating sharp, clean, and smooth lines for the character and background, similar to the hand-drawn animation style of Hazbin Hotel. The lines should be slightly exaggerated, with the character's features and body having a stylized, whimsical feel. Focus on curves, especially for the body and facial features. Make sure the character has exaggerated proportions, such as an elongated neck, large expressive eyes, and small waist.

Facial Features and Expression: Draw bold, expressive eyes that are large and very exaggerated, with highly detailed irises. The character's face should express vivid emotions, such as mischief, happiness, or drama, and the eyebrows should be highly expressive. The eyes should reflect the character's personality, with sharp or soft angles. The lips can be exaggerated, giving them a playful or seductive look, typical of Hazbin Hotel's vibrant character design.

Costume Details: The character's clothing should be eccentric, bold, and colorful, matching the chaotic and dramatic aesthetic of Hazbin Hotel. Incorporate elements like stripes, patterns, and oversized accessories (like large bows, collars, or exaggerated cuffs). Use bold, contrasting colors—vivid reds, purples, blacks, and bright neons. Make sure the texture of the clothes appears slightly exaggerated, like exaggerated folds and details in the fabric. Incorporate accessories like chains, spikes, and flamboyant designs.

Shading and Lighting: Use high-contrast, cartoonish shading, with sharp borders between light and dark areas. The shadows should be dramatic, almost theatrical, to emphasize the depth and dimensionality of the character. The light source should be bold, creating high contrast—such as glowing lights or a sharp spotlight effect that enhances the animated feel. Use angular shading to enhance the outlines of the character's body and costume, making sure to highlight exaggerated curves and edges.

Background Style: Keep the background detailed yet whimsical, using a mix of surreal, dark, and vibrant elements. Think of backgrounds like abstract, geometric designs or stylized, dark cityscapes with glowing lights. Incorporate elements of fire, neon signs, or surreal urban environments to match the Hellish and chaotic theme of Hazbin Hotel. The environment should feel alive and dynamic, but not overpower the character, giving it a balance of intricacy and simplicity.

Action and Movement: If the character is in motion, add playful or chaotic movement lines or sparks around them, but keep them stylized—sharp, exaggerated, and curving. For example, if the character is dancing or twirling, make the lines fluid and energetic. Movement should feel fast and alive, but the lines should be smooth, not jagged, matching the animated flow of Hazbin Hotel.

Color Palette: Use a saturated, bold color palette with heavy use of neon, pastel tones, and dark contrasting shades. The character should stand out with bright colors, while the background can have darker shades of purples, blacks, and reds. Ensure that every color feels exaggerated and electric, creating a lively, intense visual appeal.

Finishing Touches: Add some stylized, playful effects to the image, like glowing accents, neon glows, or animated sparkles around the character or their accessories. Use soft highlights along the hair and costume edges to give a glowing, polished feel that fits the show’s animation style. The final image should feel like a living, vibrant piece of animation, with a surreal and slightly chaotic flair."`,
        preview: "/gallery/hazbinhotel/1.jpg",
      },
      {
        id: "simpsons",
        name: "辛普森一家",
        description: "辛普森一家动画风格",
        prompt:
          "Transform this photo into Simpsons style art with yellow skin big eyes and that iconic Springfield look. Make it look like an official character from the show",
        preview: "/gallery/simpsons/1.jpg",
      },
      {
        id: "invincible",
        name: "无敌少侠",
        description: "无敌少侠动画风格",
        prompt: `"Transform this image into an Invincible style image, following these detailed steps:

Outline the Character and Background: Begin with bold, clean, and sharp black lines. Use a thicker outline for the main character and a thinner line for the background and secondary elements. Ensure the character’s silhouette is strong and muscular, with exaggerated proportions, like broad shoulders and a narrow waist.

Facial Features and Expression: For the character's face, use exaggerated yet clear features. Draw intense, sharp eyes with a strong, focused gaze. Add visible eyebrows to convey emotion, making them look determined or angry. The jawline should be defined, and facial expressions should be vivid, reflecting a serious or dramatic tone.

Costume Details: Draw the costume with bright, primary colors. The costume should have a sleek, almost tight-fitting design, similar to traditional superhero outfits. Focus on clean, flat areas of color, such as bold reds, blues, yellows, or greens. Add minimal texture to give the costume a smooth, modern feel. For details like logos or symbols, ensure they are simple and striking, often with bold outlines.

Shading and Lighting: Use sharp, high-contrast shading to emphasize muscle definition and the structure of the costume. Shadows should be stark and clear, with a strong light source coming from one direction (for example, from the top-left corner) to cast deep shadows on the opposite side. Keep the shadows mostly flat and sharp to match the style.

Background Style: Keep the background relatively simple but with hints of dynamic movement. Use muted or gradient tones for the background, emphasizing the character. For urban settings or cityscapes, use minimal details and focus on architectural lines with a comic-book style.

Action and Motion: If the scene involves movement, incorporate sharp, exaggerated motion lines that emphasize action. For example, if the character is flying or punching, create streaks of motion around them with sharp lines to show velocity and force. The impact should be emphasized with dynamic, intense lines radiating from the point of impact.

Color Palette: Use bright, saturated primary colors for the character’s costume and elements of the image. The overall tone should feel vivid and energetic, but the shadows and background colors can be more muted, maintaining a comic-book feel.

Finishing Touches: Apply a slight cel-shaded effect to keep the art in line with the Invincible style. Use flat colors and sharp transitions between light and dark areas rather than gradients, which will give the image a more illustrative and comic-book-like appearance."`,
        preview: "/gallery/invincible/1.jpg",
      },
      // Add more western animation presets...
    ],
  },
  {
    id: "art-styles",
    name: "艺术风格",
    description: "各种绘画艺术风格",
    thumbnail: "/categories/art.jpg",
    presets: [
      {
        id: "watercolor",
        name: "水彩画",
        description: "传统水彩画效果",
        prompt:
          "Transform this image into  water color style.",
        preview: "/gallery/watercolor/1.png",
      },
      {
        id: "oil-painting",
        name: "油画",
        description: "油画效果",
        prompt: "Transform this image into oil painting style.",
        preview: "/gallery/oilpaint/1.jpg",
      },
      // Add more art style presets...
    ],
  },
  {
    id: "various",
    name: "其他热门",
    description: "各种风格",
    thumbnail: "/categories/various.jpg",
    presets: [
      {
        id: "toy",
        name: "手办",
        description: "手办",
        prompt:
          "Create image. Create a toy of the person in the photo. Let it be an action figure. Next to the figure, there should be the toy’s equipment, each in its individual blisters. Don’t repeat the equipment under any circumstance. The card holding the blister should be strong orange. Also, on top of the box, write ‘Pedro Passos Coelho’ and underneath it, ‘PSD action figure’. The figure and equipment must all be inside blisters. Visualize this in a realistic way.",
        preview: "/gallery/toys/1.jpg",
      },
      {
        id: "onepiecetoy",
        name: "海贼王手办",
        description: "上传半身或全身照",
        prompt: `把照片中的人物变成《海贼王》（One Piece）动漫主题手办包装盒的风格，以等距视角（isometric）呈现。包装盒内展示的是基于照片人物的《海贼王》动漫画风设计的形象，旁边搭配有日常必备物品（苹果笔记本电脑，手机，眼镜，帽子，咖啡）同时，在包装盒旁边还应呈现该手办本体的实物效果，采用逼真的、具有真实感的渲染风格。`,
        preview: "/gallery/onepiecetoys/1.jpg",
      },
      {
        id: "meme",
        name: "个人表情包",
        description: "上传您的自拍，制作六张专属表情包",
        prompt:
          "请创作一套全新的 chibi sticker，共六个独特姿势，以用户形象为主角。第一款是双手比出剪刀手，俏皮地眨眼；第二款是泪眼汪汪，嘴唇微微颤动，呈现可爱哭泣的表情；第三款是张开双臂，做出热情的大大拥抱姿势；第四款是侧卧入睡，靠着迷你枕头，带着甜甜的微笑；第五款是自信满满地向前方伸手指，周围点缀闪亮特效；第六款是手势飞吻，周围飘散出爱心表情。所有形象应保留 chibi 美学风格，夸张有神的大眼睛，柔和的面部线条，活泼俏皮的短款黑色发型，配以大胆领口设计的白色服饰。背景使用充满活力的红色，并搭配星星或彩色纸屑元素进行装饰，周边适当留白。",
        preview: "/gallery/custommeme/1.jpg",
      },
    ],
  },
] as const;
