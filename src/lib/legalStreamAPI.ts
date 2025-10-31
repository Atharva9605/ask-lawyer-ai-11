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

    // Ensure both fields are included in the request
    formData.append("case_description", caseDescription || '');
    formData.append("first_instruction", firstInstruction || '');
    if (file) {
      formData.append("case_file", file);
    }

    try {
      this.options?.onStart?.();
      console.log('Making request to:', url); // Debug log

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode and handle partial chunks
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            console.log('Received data:', data); // Debug log
            
            // Handle conversation ID
            if (data.includes('[ID:')) {
              const idMatch = data.match(/\[ID:\s*([^\]]+)\]/);
              if (idMatch) {
                this.currentConversationId = idMatch[1].trim();
                this.options?.onConversationId?.(this.currentConversationId);
                continue;
              }
            }

            // Handle part number
            const partMatch = data.match(/\[PART\s*(\d+)\]/i);
            if (partMatch) {
              const partNumber = parseInt(partMatch[1], 10);
              this.options?.onDirectivePart?.(partNumber);
              continue;
            }

            // Send the content to the callback
            this.options?.onDeliverable?.(data);
          }
        }
      }

      this.options?.onComplete?.(true);
      return this.currentConversationId || 'unknown';

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("StreamingClient Error:", errorMessage);
      this.options?.onError?.(errorMessage);
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