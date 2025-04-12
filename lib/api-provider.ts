export interface ProviderChoice {
  index: number;
  message: { role: string; content: string | null };
  finish_reason: string;
}

export interface ProviderUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: Record<string, number>;
  completion_tokens_details?: Record<string, number>;
}

export interface ProviderResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ProviderChoice[];
  usage: ProviderUsage;
}

export interface ApiAnalysisResult {
  success: boolean;
  imageUrl?: string;
  downloadUrl?: string;
  prompt?: Record<string, unknown>;
  error?: string;
  rawContent: string;
  tokens: ProviderUsage;
  progress?: number[];
  taskId?: string;
  genId?: string;
}

export function analyzeApiResult(
  response: ProviderResponse,
): ApiAnalysisResult {
  const content = response.choices?.[0]?.message?.content ?? "";
  let imageUrl: string | undefined;
  let downloadUrl: string | undefined;
  let prompt: Record<string, unknown> | undefined;
  let error: string | undefined;

  // Try to extract image URL from markdown ![](...)
  const imageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (imageMatch) {
    imageUrl = imageMatch[1];
  }

  // Try to extract download URL from markdown [下载⏬](...)
  const downloadMatch = content.match(/\[下载⏬\]\((https?:\/\/[^\s)]+)\)/);
  if (downloadMatch) {
    downloadUrl = downloadMatch[1];
  }

  // Try to extract prompt JSON from code block or inline
  // Matches ```\n{ ... }\n``` or ```json\n{ ... }\n``` or just { ... }
  const promptMatch =
    content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
    content.match(/({[\s\S]+?})/);

  if (promptMatch) {
    try {
      prompt = JSON.parse(promptMatch[1]);
    } catch {
      // ignore parse error
    }
  }

  // Detect error/failure
  if (/Generation failed|失败|❌/i.test(content)) {
    error = "图片生成失败";
  }

  // If no imageUrl and error not set, check for other error hints
  if (!imageUrl && !error) {
    if (/error|failed|失败|❌/i.test(content)) {
      error = "图片生成失败";
    }
  }

  // If imageUrl found, it's a success
  const success = !!imageUrl;

  // Extract progress percentages
  const progressMatches = [...content.matchAll(/Progress (\d+)%/g)];
  const progress = progressMatches.map((m) => Number(m[1]));

  // Extract task ID
  const taskIdMatch = content.match(/ID: `([^`]+)`/);
  const taskId = taskIdMatch ? taskIdMatch[1] : undefined;

  // Extract gen_id from prompt or content
  let genId: string | undefined = undefined;
  if (prompt && typeof prompt === "object" && "gen_id" in prompt) {
    genId = String((prompt as Record<string, unknown>).gen_id);
  } else {
    const genIdMatch = content.match(/gen_id: `([^`]+)`/);
    if (genIdMatch) genId = genIdMatch[1];
  }

  return {
    success,
    imageUrl,
    downloadUrl,
    prompt,
    error,
    rawContent: content,
    tokens: response.usage,
    progress: progress.length > 0 ? progress : undefined,
    taskId,
    genId,
  };
}
