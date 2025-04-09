import { useState, useCallback, useRef } from "react";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

interface UseChatOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const appendMessage = useCallback((message: ChatCompletionMessageParam) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const createCompletion = useCallback(
    async (newMessages: ChatCompletionMessageParam[], stream = false) => {
      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/chat${stream ? "/stream" : ""}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: newMessages,
            apiKey: options.apiKey,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Request failed");
        }

        if (stream) {
          return handleStreamResponse(response);
        } else {
          return handleJsonResponse(response);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options],
  );

  const handleJsonResponse = async (response: Response) => {
    const data = await response.json();
    appendMessage(data.choices[0].message);
    return data;
  };

  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            assistantMessage += parsed;
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage?.role === "assistant") {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, content: assistantMessage },
                ];
              }
              return [
                ...prev,
                { role: "assistant", content: assistantMessage },
              ];
            });
          } catch (err) {
            console.error("Error parsing stream data:", err);
          }
        }
      }
    }

    return { content: assistantMessage };
  };

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    appendMessage,
    createCompletion,
    isLoading,
    error,
    stopGeneration,
    clearMessages,
  };
}
