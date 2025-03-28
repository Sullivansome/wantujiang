import { STYLE_PRESETS } from "./constants";

type GenerateOptions = {
  inputDescription?: string;
  preserveOriginal?: boolean;
  intensity?: number; // 1-10
};

export function generatePrompt(
  presetId: string,
  options: GenerateOptions = {},
): string {
  const preset = STYLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error("Invalid preset ID");

  let prompt = preset.promptTemplate.replace(
    "{inputImage}",
    options.inputDescription || "这张图片",
  );

  if (options.preserveOriginal) {
    prompt += "，但保持原始内容的主要特征";
  }

  if (options.intensity) {
    prompt += `，风格强度${options.intensity}/10`;
  }

  return prompt;
}

// Example usage:
// generatePrompt("chinese-ink", { inputDescription: "人物肖像" })
