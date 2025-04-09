import OpenAI from "openai";

// Configuration interface
interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

// Response interface
interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Error handling class
class OpenAIError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class OpenAIClient {
  private client: OpenAI;
  private defaultModel: string = "gpt-4o";
  private defaultMaxTokens: number = 2000;
  private defaultTemperature: number = 0.7;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });
  }

  /**
   * Create a chat completion with GPT-4o
   */
  async createChatCompletion(
    messages: OpenAI.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      stream?: boolean;
    },
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        max_tokens: options?.max_tokens || this.defaultMaxTokens,
        temperature: options?.temperature || this.defaultTemperature,
        stream: options?.stream || false,
      });

      return response as unknown as ChatCompletionResponse;
    } catch (error: any) {
      throw new OpenAIError(error.message, error.status, error.code);
    }
  }

  /**
   * Stream chat completion for real-time responses
   */
  async *createStreamingChatCompletion(
    messages: OpenAI.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
    },
  ): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        max_tokens: options?.max_tokens || this.defaultMaxTokens,
        temperature: options?.temperature || this.defaultTemperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        yield content;
      }
    } catch (error: any) {
      throw new OpenAIError(error.message, error.status, error.code);
    }
  }
}

export { OpenAIClient, OpenAIError, type ChatCompletionResponse };
