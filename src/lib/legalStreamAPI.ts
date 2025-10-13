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
   * Initiates the legal analysis by sending the case facts to the backend.
   * @param caseFacts The detailed description of the legal case.
   */
  async startAnalysis(caseFacts: string) {
    console.log('🚀 Starting analysis...');
    console.log('📍 API URL:', `${API_BASE_URL}/generate_directive`);
    console.log('📝 Case facts length:', caseFacts.length);
    
    this.close();
    this.abortController = new AbortController();
    this.callbacks.onStart?.();

    try {
      console.log('📡 Sending POST request...');
      const response = await fetch(`${API_BASE_URL}/generate_directive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_facts: caseFacts }),
        signal: this.abortController.signal,
      });

      console.log('✅ Response received');
      console.log('📊 Status:', response.status);
      console.log('📋 Status Text:', response.statusText);
      console.log('🔍 Headers:', Object.fromEntries(response.headers.entries()));
      console.log('🌊 Is streaming?', response.body !== null);

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
        console.error('Error stack:', error.stack);
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
    // This method can be implemented similarly to startAnalysis if needed
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
          console.log('📊 Total chunks received:', chunkCount);
          console.log('📦 Total bytes received:', totalBytes);
          break;
        }
        
        chunkCount++;
        totalBytes += value.length;
        
        const chunk = decoder.decode(value, { stream: true });
        console.log(`📦 Chunk ${chunkCount} (${value.length} bytes):`, chunk.substring(0, 100));
        
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        console.log(`📬 Processing ${lines.length} lines from buffer`);
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          console.log('📨 Raw line:', trimmedLine);
          
          if (!trimmedLine.startsWith('data:')) {
            console.log('⏭️ Skipping non-data line');
            continue;
          }
          
          const data = trimmedLine.substring(5).trim();
          if (!data) {
            console.log('⏭️ Skipping empty data');
            continue;
          }

          console.log('📄 Data content:', data.substring(0, 150));

          // --- Marker Processing Logic ---
          if (data.includes('[CONVERSATION_ID]')) {
            const idMatch = data.match(/\[CONVERSATION_ID\]\s*(\w+)/);
            if (idMatch?.[1]) {
              console.log('🆔 Conversation ID found:', idMatch[1]);
              this.callbacks.onConversationId?.(idMatch[1]);
            }
            continue;
          }
          
          if (data.includes('[WAR-GAME-DIRECTIVE-COMPLETE]')) {
            console.log('🎉 Analysis complete marker received');
            this.callbacks.onComplete?.();
            this.close();
            return;
          }
          
          if (data === '[THOUGHTS-BEGIN]') {
            console.log('🧠 Thoughts section started');
            this.inThinking = true;
            continue;
          }
          
          if (data === '[THOUGHTS-END]' || data === '[THOUGHTS: none]') {
            console.log('🧠 Thoughts section ended');
            this.inThinking = false;
            continue;
          }
          
          if (data === '[DELIVERABLE-BEGIN]') {
            console.log('📝 Deliverable section started');
            this.inDeliverable = true;
            continue;
          }
          
          if (data === '[DELIVERABLE-END]' || data === '[DELIVERABLE: none]') {
            console.log('📝 Deliverable section ended');
            this.inDeliverable = false;
            continue;
          }
          
          const partMatch = data.match(/^=== PART (\d+) ===/);
          if (partMatch) {
            this.currentPartNumber = parseInt(partMatch[1], 10);
            console.log('🔢 New part detected:', this.currentPartNumber);
            this.callbacks.onDirectivePart?.(this.currentPartNumber);
            continue;
          }
          
          if (data === '[SEARCH_QUERIES]') {
            console.log('🔍 Search queries section started');
            continue;
          }
          
          if (data === '[SEARCH_QUERIES: none]') {
            console.log('🔍 No search queries for this part');
            continue;
          }
          
          // Capture individual search query lines (start with - or are after [SEARCH_QUERIES])
          if (data.startsWith('- "') || data.startsWith('- \'') || data.startsWith('- ')) {
            const query = data.replace(/^- ["']?|["']?$/g, '').trim();
            if (query && query !== 'none') {
              console.log('🔍 Search query found:', query);
              this.callbacks.onSearchQueries?.([query]);
            }
            continue;
          }
          
          // --- Content Delivery Logic ---
          if (this.inDeliverable) {
            console.log('📝 Processing deliverable content for part', this.currentPartNumber);
            if (this.currentPartNumber === 5) {
              try {
                const swotData: SwotMatrixData = JSON.parse(data);
                console.log('📊 SWOT data parsed:', swotData);
                this.callbacks.onDeliverable?.(swotData);
              } catch (e) {
                console.log('⚠️ Failed to parse SWOT JSON, treating as string');
                this.callbacks.onDeliverable?.(data);
              }
            } else {
              console.log('📄 Deliverable text:', data.substring(0, 100));
              this.callbacks.onDeliverable?.(data);
            }
          }
          
          if (this.inThinking) {
            console.log('💭 Thinking content:', data.substring(0, 100));
            this.callbacks.onThinking?.(data);
          }
        }
      }
      
      console.log('✅ Stream processing completed successfully');
      
    } catch (error) {
      console.error('💥 Error processing stream:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      this.callbacks.onError?.("An error occurred while processing the stream.");
    } finally {
      console.log('🔚 Releasing reader lock');
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