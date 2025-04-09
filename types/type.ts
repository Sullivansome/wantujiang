export type TuZiChatCompletionContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string; detail?: "low" | "high" | "auto" };
    };

export type TuZiChatCompletionMessage = {
  role: "user" | "assistant";
  content: string | TuZiChatCompletionContentPart[];
};

export type TuZiChatCompletionParams = {
  model: string;
  messages: TuZiChatCompletionMessage[];
  stream?: boolean;
  max_tokens?: number;
};
