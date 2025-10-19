/**
 * The base URL for your deployed FastAPI backend.
 * Ensure this points to your live Render service.
 */
const API_BASE_URL = "http://localhost:8000";

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
 * Defines the callback functions that the streaming client uses to send
 * clean, parsed data back to the React components.
 */
export interface StreamingCallbacks {
  onStart?: () => void;
  onConversationId?: (conversationId: string) => void;
  onThinking?: (content: string) => void;
  onSearchQueries?: (queries: string[]) => void;
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
  private conversationId: string | null = null;
  private inThinking = false;
  private inDeliverable = false;
  private currentPartNumber = 0;

  constructor(callbacks: StreamingCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initiates the legal analysis by sending the case facts (TEXT OR FILE) to the backend.
   * @param input The detailed description of the legal case (string) OR the file to upload (File).
   */
  async startAnalysis(input: string | File) {
    console.log('🚀 Starting analysis...');
    this.close();
    this.abortController = new AbortController();
    this.callbacks.onStart?.();

    const url = `${API_BASE_URL}/generate_directive`;
    let body: FormData | string;
    let headers: HeadersInit = {};
    let method: string = 'POST';

    // === LOGIC: Handle File Upload vs. Text Input ===
    if (input instanceof File) {
      console.log('📁 Sending file upload...');
      const formData = new FormData();
      formData.append('case_file', input); // Key must match FastAPI endpoint: case_file: UploadFile = File(...)
      body = formData;
      // Note: Do not set Content-Type header for FormData, let browser handle it.
    } 
    else {
      // NOTE: This JSON input logic is for the original /generate_directive endpoint, 
      // which is now expecting a file. Reverting the backend to handle both is complex.
      // Assuming for now, all directives go through the file endpoint (which accepts text content from file).
      // For this implementation, we assume only file input is used, but keeping JSON logic structure 
      // would require a separate endpoint in FastAPI. Sticking to the file endpoint for now.
      console.log('⚠️ Text input is not directly supported by the current /generate_directive endpoint. Please use the UploadDocument component.');
      this.callbacks.onError?.("The text input mode is temporarily unavailable. Please upload a file.");
      return; 
    }

    try {
      console.log('📡 Sending POST request...');
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: body,
        signal: this.abortController.signal,
      });

      console.log('✅ Response received');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error Response:', errorText);
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
      }
      
      if (!response.body) {
        console.error('❌ No response body received');
        throw new Error('No response body received from server');
      }
      
      console.log('🎬 Starting to read stream...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      await this.processSSEStream(reader, decoder);

    } catch (error) {
      console.error('💥 Error in startAnalysis:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      
      if (!(error instanceof Error && error.name === 'AbortError')) {
        this.callbacks.onError?.('Failed to connect to the analysis service.');
      }
    }
  }

  /**
   * Sends a follow-up chat message using the active conversation ID.
   * @param query The user's question.
   */
  async sendChatMessage(query: string) {
    if (!this.conversationId) {
      this.callbacks.onError?.("No active conversation ID found.");
      return;
    }
    // This method needs the actual implementation for the /chat endpoint
    // We will stub the stream reading logic for now
    this.callbacks.onStart?.();
    this.conversationId = sessionStorage.getItem('legal_conversation_id');
    const chatUrl = `${API_BASE_URL}/chat`;

    try {
        const response = await fetch(chatUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, conversation_id: this.conversationId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.callbacks.onError?.(`Chat error: ${response.status} - ${errorText}`);
            return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process SSE events
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
                if (event.startsWith('data:')) {
                    const data = event.substring(5).trim();
                    this.callbacks.onDeliverable?.(data); // Append chat response chunk
                }
            }
        }
        this.callbacks.onComplete?.();

    } catch (error) {
        this.callbacks.onError?.("Failed to send chat message.");
    }
  }

  /**
   * The core logic for parsing the raw SSE stream from the backend.
   * It handles markers, JSON objects, and plain text.
   */
  private async processSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder) {
    let buffer = '';
    let chunkCount = 0;
    let totalBytes = 0;
    
    console.log('🔄 Processing SSE stream...');
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✋ Stream ended');
          break;
        }
        
        chunkCount++;
        totalBytes += value.length;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (!trimmedLine.startsWith('data:')) continue;
          
          const data = trimmedLine.substring(5).trim();
          if (!data) continue;

          // --- Marker Processing Logic ---
          if (data.includes('[CONVERSATION_ID]')) {
            const idMatch = data.match(/\[CONVERSATION_ID\]\s*(\w+)/);
            if (idMatch?.[1]) {
              this.conversationId = idMatch[1];
              this.callbacks.onConversationId?.(idMatch[1]);
            }
            continue;
          }
          
          if (data.includes('[WAR-GAME-DIRECTIVE-COMPLETE]')) {
            this.callbacks.onComplete?.();
            this.close();
            return;
          }
          
          if (data === '[THOUGHTS-BEGIN]') {
            this.inThinking = true;
            continue;
          }
          
          if (data === '[THOUGHTS-END]' || data === '[THOUGHTS: none]') {
            this.inThinking = false;
            continue;
          }
          
          if (data === '[DELIVERABLE-BEGIN]') {
            this.inDeliverable = true;
            continue;
          }
          
          if (data === '[DELIVERABLE-END]' || data === '[DELIVERABLE: none]') {
            this.inDeliverable = false;
            continue;
          }
          
          const partMatch = data.match(/^=== PART (\d+) ===/);
          if (partMatch) {
            this.currentPartNumber = parseInt(partMatch[1], 10);
            this.callbacks.onDirectivePart?.(this.currentPartNumber);
            continue;
          }
          
          if (data === '[SEARCH_QUERIES]' || data === '[SEARCH_QUERIES: none]') {
            continue;
          }

          // Add logic to capture the summarized facts delivered by the backend
          const summaryMatch = data.match(/\[SUMMARIZED_FACTS_BEGIN\]\s*(.+)/);
          if (summaryMatch) {
              sessionStorage.setItem('legal_case_description', summaryMatch[1].trim());
              continue;
          }
          
          // Capture individual search query lines (start with - or are after [SEARCH_QUERIES])
          if (data.startsWith('- "') || data.startsWith('- \'') || data.startsWith('- ')) {
            const query = data.replace(/^- ["']?|["']?$/g, '').trim();
            if (query && query !== 'none') {
              this.callbacks.onSearchQueries?.([query]);
            }
            continue;
          }

          // --- Content Delivery Logic ---
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
          }
          
          if (this.inThinking) {
            this.callbacks.onThinking?.(data);
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
    console.log('🛑 Closing stream connection');
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}