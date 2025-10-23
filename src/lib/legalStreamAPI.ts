import { AnalysisState } from '@/pages/Analyze'; // Assuming this import exists

// Define the shape of the SWOT matrix data for Part 5 (Assuming these types exist)
export interface SwotMatrixData {
  strength: string[];
  weakness: string[];
  opportunity: string[];
  threat: string[];
}

export interface LinkSummary {
  url: string;
  title: string;
  status: 'success' | 'failure';
  summary: string;
}

// New: options accepted by the client constructor
export interface LegalStreamingClientOptions {
  baseURL?: string;
  onStart?: () => void;
  onConversationId?: (id: string) => void;
  onDirectivePart?: (partNumber: number) => void;
  onInternalReasoning?: (content: string) => void;
  onSearchQueries?: (queries: string[]) => void;
  onToolResult?: (query: string, content: string) => void;
  onDeliverable?: (content: string) => void; // used for streamed chunks
  onComplete?: (success: boolean) => void;
  onError?: (error: string) => void;
}

const DEFAULT_BASE_URL = 'https://legal-backend-api-chatbot.onrender.com';

export class LegalStreamingClient {
  private baseURL: string;
  private options?: LegalStreamingClientOptions;
  private currentConversationId: string | null = null;

  // Accept either a base URL string or an options object (which may include baseURL)
  constructor(baseURLOrOptions: string | LegalStreamingClientOptions = DEFAULT_BASE_URL) {
    if (typeof baseURLOrOptions === 'string') {
      this.baseURL = baseURLOrOptions || DEFAULT_BASE_URL;
    } else {
      this.options = baseURLOrOptions;
      this.baseURL = baseURLOrOptions.baseURL ?? DEFAULT_BASE_URL;
    }
  }
  
  // ... (other methods, e.g., chat) ...

  // startAnalysis now accepts optional text params and optional callbacks.
  // If callbacks are not provided per-call, constructor options are used.
  public async startAnalysis(
    file: File | null,
    caseDescription?: string,
    firstInstruction?: string,
    onChunk?: (chunk: string) => void,
    onComplete?: (success: boolean) => void,
    onError?: (error: string) => void
  ): Promise<string> {
    const url = `${this.baseURL}/generate_directive`;
    const formData = new FormData();

    // Use provided text fields only if available (no strict client-side validation here;
    // callers that require validation should validate before calling)
    if (typeof caseDescription === 'string' && caseDescription.trim()) {
      formData.append("case_description", caseDescription.trim());
    }
    if (typeof firstInstruction === 'string' && firstInstruction.trim()) {
      formData.append("first_instruction", firstInstruction.trim());
    }

    if (file) {
      formData.append("case_file", file);
    }
    
    let conversationId = 'temp-id'; 
    let hasReturnedConversationId = false;

    // Determine handlers: prefer per-call, otherwise fall back to constructor-provided options
    const chunkHandler = onChunk ?? this.options?.onDeliverable ?? (() => {});
    const completeHandler = onComplete ?? this.options?.onComplete ?? (() => {});
    const errorHandler = onError ?? this.options?.onError ?? (() => {});
    const conversationIdHandler = this.options?.onConversationId;

    try {
      this.options?.onStart?.();

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        // SSE / stream parsing logic
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);

                // Extract Conversation ID and notify constructor callback if present
                if (!hasReturnedConversationId) {
                    const idMatch = data.match(/\[ID:\s*([^\]]+)\]/);
                    if (idMatch) {
                        conversationId = idMatch[1].trim();
                        this.currentConversationId = conversationId;
                        hasReturnedConversationId = true;
                        conversationIdHandler?.(conversationId);
                    }
                }
                
                // deliver streamed chunk to handler
                try {
                  chunkHandler(data);
                } catch (_) {
                  // swallow handler errors to keep stream alive
                }
            }
        }
      }

      completeHandler(true);
      return conversationId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("💥 Error in startAnalysis:", errorMessage); 
      errorHandler(errorMessage);
      completeHandler(false);
      throw error; 
    }
  }

  // Minimal close() stub so callers can call it safely.
  public close() {
    // Implement actual teardown if using WebSocket/SSE connections.
    return;
  }

  // Lightweight placeholder for chat send message - implement as needed.
  public async sendChatMessage(_message: string) {
    throw new Error("sendChatMessage is not implemented on this client yet.");
  }
}

// Export a ready-to-use default client configured with the backend URL
export const defaultLegalStreamingClient = new LegalStreamingClient();