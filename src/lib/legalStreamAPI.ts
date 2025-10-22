/**
 * The base URL for your deployed FastAPI backend.
 * Ensure this points to your live Render service.
 */
const API_BASE_URL = "https://legal-backend-api-chatbot.onrender.com";

/**
 * Defines the structured data format for the SWOT matrix,
 * which the backend sends for Part 5 of the analysis.
 */
export interface SwotMatrixData {
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
}

/**
 * Interface to hold the structured data for a single search result
 */
export interface ToolResult { 
  query: string;
  content: string;
}

/**
 * Defines the callback functions that the streaming client uses to send
 * clean, parsed data back to the React components.
 */
export interface StreamingCallbacks {
  onStart?: () => void;
  onConversationId?: (conversationId: string) => void;
  onThinking?: (content: string) => void; // Used for [INTERNAL-REASONING]
  onSearchQueries?: (query: string) => void; // Sends one query at a time
  onToolResultChunk?: (query: string, content: string) => void; // NEW: For streaming search result content
  onDeliverable?: (content: string | SwotMatrixData) => void;
  onDirectivePart?: (partNumber: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * The main client for handling SSE communication with the legal AI backend.
 */
export class LegalStreamingClient {
  private abortController: AbortController | null = null;
  private callbacks: StreamingCallbacks;
  private currentPartNumber: number | null = null; 
  private conversationId: string | null = null; 
  
  // Internal State Tracking for New Tags
  private inThinking: boolean = false;
  private  inDeliverable: boolean = false;
  private inSearchQueriesList: boolean = false; 
  private inToolResult: boolean = false;      
  private currentToolQuery: string = '';       

  constructor(callbacks: StreamingCallbacks) {
    this.callbacks = callbacks;
  }

  public async streamDirective(file: File, caseDescription: string, firstInstruction: string) {
    this.abortController = new AbortController();
    this.callbacks.onStart?.();

    try {
        const formData = new FormData();
        formData.append("case_file", file);
        formData.append("case_description", caseDescription);
        formData.append("first_instruction", firstInstruction);

        const response = await fetch(`${API_BASE_URL}/generate_directive`, {
            method: 'POST',
            body: formData,
            signal: this.abortController.signal,
        });

        if (!response.ok || !response.body) {
            this.callbacks.onError?.(`HTTP Error: ${response.statusText}`);
            return;
        }

        const reader = response.body.getReader();
        await this.processStream(reader);

    } catch (error) {
        if (this.abortController.signal.aborted) {
            console.log('Stream aborted successfully.');
        } else {
            const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
            this.callbacks.onError?.(errorMessage);
        }
    }
  }

  private async processStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder("utf-8");
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process line by line
        let lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last, incomplete line in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();

            // -----------------------------------------------------
            // 1. BLOCK START TAGS (Set Flags)
            // -----------------------------------------------------
            if (data.includes('[INTERNAL-REASONING-BEGIN]')) { 
              this.inThinking = true;
              this.inDeliverable = this.inSearchQueriesList = this.inToolResult = false;
              continue;
            }
            if (data.includes('[SEARCH_QUERIES-BEGIN]')) { 
              this.inSearchQueriesList = true;
              this.inThinking = this.inDeliverable = this.inToolResult = false;
              continue;
            }
            if (data.includes('[DELIVERABLE-BEGIN]')) {
              this.inDeliverable = true;
              this.inThinking = this.inSearchQueriesList = this.inToolResult = false;
              continue;
            }
            // Handle Tool Result Start (Captures the query after the tag)
            const toolResultStartMatch = data.match(/\[TOOL-RESULT-BEGIN\]\s*(.*)/);
            if (toolResultStartMatch) {
              this.inToolResult = true;
              this.currentToolQuery = toolResultStartMatch[1].trim();
              this.inThinking = this.inDeliverable = this.inSearchQueriesList = false;
              continue;
            }
            
            // -----------------------------------------------------
            // 2. BLOCK END TAGS (Unset Flags)
            // -----------------------------------------------------
            if (data.includes('[INTERNAL-REASONING-END]') || data.includes('[INTERNAL-REASONING: none]')) {
              this.inThinking = false;
              continue;
            }
            if (data.includes('[SEARCH_QUERIES-END]') || data.includes('[SEARCH_QUERIES: none]')) { 
              this.inSearchQueriesList = false;
              continue;
            }
            if (data.includes('[DELIVERABLE-END]') || data.includes('[DELIVERABLE: none]')) {
              this.inDeliverable = false;
              continue;
            }
            if (data.includes('[TOOL-RESULT-END]')) {
              this.inToolResult = false; 
              this.currentToolQuery = '';
              continue;
            }
            if (data.includes('[WAR-GAME-DIRECTIVE-COMPLETE]')) {
              this.callbacks.onComplete?.();
              continue;
            }

            // -----------------------------------------------------
            // 3. META/CONTROL LOGIC
            // -----------------------------------------------------
            // Part Number Logic
            const partMatch = data.match(/=== PART (\d+) ===/);
            if (partMatch) {
              this.currentPartNumber = parseInt(partMatch[1], 10);
              this.callbacks.onDirectivePart?.(this.currentPartNumber);
              this.inThinking = this.inDeliverable = this.inSearchQueriesList = this.inToolResult = false; // Reset all flags
              continue;
            }
            // Conversation ID Logic
            const idMatch = data.match(/\[CONVERSATION_ID\]\s*(.*)/);
            if (idMatch) {
              this.conversationId = idMatch[1].trim();
              this.callbacks.onConversationId?.(this.conversationId);
              continue;
            }
            
            // -----------------------------------------------------
            // 4. CONTENT DELIVERY LOGIC
            // -----------------------------------------------------
            
            // Search Queries (lines starting with -)
            if (this.inSearchQueriesList && data.startsWith('- ')) {
              const query = data.replace(/^- [\"']?|[\"']?$/g, '').trim();
              if (query && query !== 'none') {
                this.callbacks.onSearchQueries?.(query); 
              }
              continue;
            }
            
            // Tool Result Content (Streaming links/sources content)
            if (this.inToolResult) {
              this.callbacks.onToolResultChunk?.(this.currentToolQuery, data);
              continue;
            }
            
            // Deliverable Content (Main Report)
            if (this.inDeliverable) {
              if (this.currentPartNumber === 5) {
                try {
                  const swotData: SwotMatrixData = JSON.parse(data);
                  this.callbacks.onDeliverable?.(swotData);
                } catch (e) {
                  this.callbacks.onDeliverable?.(data);
                }
              } else {
                this.callbacks.onDeliverable?.(data);
              }
              continue;
            }
            
            // Thinking Content (Internal Reasoning)
            if (this.inThinking) {
              this.callbacks.onThinking?.(data);
              continue;
            }
            
            // General info/errors
            if (data.startsWith('[INFO]')) {
                console.log(data);
            }
          }
        }
      
    } 
    } catch (error) {
      this.callbacks.onError?.("An error occurred while processing the stream.");
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Closes the active network connection.
   */
  public close() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}