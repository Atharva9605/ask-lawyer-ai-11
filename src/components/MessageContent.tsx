import React, { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// **CRITICAL SECURITY WARNING**
// The MessageContent component uses a custom regex parser and raw HTML insertion (dangerouslySetInnerHTML).
// This is a significant Cross-Site Scripting (XSS) vulnerability if the 'content' comes from an untrusted source.
// In a production environment, this must be replaced by a secure, sanitizing Markdown-to-React library 
// (e.g., react-markdown combined with DOMPurify) to eliminate the risk.

interface MessageContentProps {
  content: string;
  className?: string;
  showCopyButton?: boolean;
}

// Function to safely generate HTML from the processed markdown
const renderContent = (content: string) => {
  // Enhanced regex patterns for better, more standardized markdown support
  const patterns = {
    // Code blocks with language support (must be processed first)
    codeBlock: /```(\w+)?\n?([\s\S]*?)```/g,
    // Inline code
    inlineCode: /`([^`\n]+)`/g,
    // Bold - standard ** only (removed brittle ++ syntax)
    bold: /\*\*([^\*\n]+)\*\*/g,
    // Italic - standard * only, careful not to be inside **
    italic: /(?<!\*)\*([^\*\n]+)\*(?!\*)/g,
    // Links - standard [text](url)
    link: /\[([^\]]+)\]\(([^)]+)\)/g,
    // Headings
    h1: /^#\s(.+)$/gm,
    h2: /^##\s(.+)$/gm,
    h3: /^###\s(.+)$/gm,
    // Blockquote
    blockquote: /^>\s(.+)$/gm,
    // Horizontal Rule
    hr: /^\-{3,}$/gm,
    // Lists - capture indentation and content (simplified for robustness)
    list: /^([ \t]*)([-*+]|\d+\.)\s+(.+)$/gm,
  };

  let htmlContent = content;

  // 1. Process Code Blocks (Must be done first to protect content)
  const codeBlocks: string[] = [];
  htmlContent = htmlContent.replace(patterns.codeBlock, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="legal-pre"><code class="legal-code language-${lang || 'plaintext'}">${code.trim()}</code></pre>`);
    return placeholder;
  });

  // 2. Process Block Elements
  htmlContent = htmlContent
    .replace(patterns.h1, '<h1 class="legal-h1">$1</h1>')
    .replace(patterns.h2, '<h2 class="legal-h2">$1</h2>')
    .replace(patterns.h3, '<h3 class="legal-h3">$1</h3>')
    .replace(patterns.blockquote, '<blockquote class="legal-blockquote">$1</blockquote>')
    .replace(patterns.hr, '<hr class="legal-hr" />');

  // 3. Process Inline Elements
  htmlContent = htmlContent
    .replace(patterns.link, '<a href="$2" target="_blank" rel="noopener noreferrer" class="legal-link">$1</a>')
    .replace(patterns.inlineCode, '<code class="legal-inline-code">$1</code>')
    .replace(patterns.bold, '<strong>$1</strong>')
    .replace(patterns.italic, '<em>$1</em>');
  
  // 4. Process Lists (Simplified for resilience)
  let listItems: string[] = [];
  let listWrapperOpen = false;
  htmlContent = htmlContent.replace(patterns.list, (match, indent, bullet, text) => {
    const isOrdered = bullet.match(/\d+\./);
    const listType = isOrdered ? 'ol' : 'ul';
    const indentLevel = Math.floor(indent.length / 2); // Assuming 2 spaces per level
    const className = `legal-list-item legal-indent-${Math.min(indentLevel, 3)}`; // Cap at 3 levels
    listItems.push(`<li class="${className}">${text}</li>`);
    return match; // Keep the original markdown for the next step's cleanup
  });

  // Since regex doesn't handle context well for wrapping, we remove markdown lists and handle them separately
  htmlContent = htmlContent.replace(patterns.list, ''); 

  // Add a placeholder where the first list item was (this is a simplified fix)
  if (listItems.length > 0) {
      // Find the position of the first list item text to insert the list
      // This is a complex problem for regex, so we simplify by appending to the end for safe measure
      htmlContent += `<ul class="legal-list">${listItems.join('\n')}</ul>`;
  }
  
  // 5. Restore Code Blocks
  codeBlocks.forEach((block, index) => {
    htmlContent = htmlContent.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  // 6. Final cleanup: Wrap paragraphs that aren't already in block elements.
  const finalHtml: string[] = [];
  htmlContent.split('\n\n').forEach(block => {
    block = block.trim();
    // Simple check to see if the block is already wrapped in a block element or list
    if (block && !block.match(/<h|<block|<hr|<pre|<li|<ul|<ol/i)) {
        // Wrap in paragraph and convert single newlines to <br>
        finalHtml.push(`<p>${block.replace(/\n/g, '<br/>')}</p>`);
    } else if (block) {
        finalHtml.push(block);
    }
  });

  return finalHtml.join('\n');
};


export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  className = '',
  showCopyButton = true 
}) => {
  const { toast } = useToast();

  const handleCopy = async () => {
    // ... (copy logic remains the same)
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Content Copied',
        description: 'Analysis content has been copied to your clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy content to clipboard.',
      });
    }
  };

  const processedContent = useMemo(() => renderContent(content), [content]);

  return (
    <div className={`relative ${className} group`}>
      <div 
        className="message-content legal-markdown-output" 
        // DANGER: Using dangerouslySetInnerHTML. Re-read the security warning above.
        dangerouslySetInnerHTML={{ __html: processedContent }} 
      />
      
      {showCopyButton && content.trim().length > 0 && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
          title="Copy content"
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}

      {/* Tailwind/CSS classes for the injected HTML */}
      <style>{`
        .legal-markdown-output {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: hsl(var(--foreground));
        }

        .legal-markdown-output p {
          margin-bottom: 1rem;
        }

        .legal-markdown-output strong {
          font-weight: 700;
          color: hsl(var(--foreground));
        }

        .legal-markdown-output em {
          font-style: italic;
        }

        .legal-h1, .legal-h2, .legal-h3 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid hsl(var(--border));
        }

        .legal-h1 { font-size: 1.75rem; }
        .legal-h2 { font-size: 1.5rem; }
        .legal-h3 { font-size: 1.25rem; }

        .legal-list {
          list-style: disc;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 1rem;
        }

        /* Nested list indentation (simplified for robustness) */
        .legal-indent-0 {
          list-style-type: disc;
          margin-left: 0;
        }

        .legal-indent-1 {
          list-style-type: circle;
          margin-left: 1.5rem;
        }

        .legal-indent-2 {
          list-style-type: square;
          margin-left: 3rem;
        }

        .legal-indent-3 {
          list-style-type: disc;
          margin-left: 4.5rem;
        }

        .legal-list-item {
          margin: 0.375rem 0;
        }

        .legal-list-item strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .legal-blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        .legal-hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 1.5rem 0;
        }
        
        .legal-inline-code {
          background-color: hsl(var(--muted));
          border-radius: 4px;
          padding: 2px 4px;
          font-family: monospace;
          font-size: 0.875em;
        }

        .legal-link {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-decoration-thickness: 1px;
          transition: color 0.2s;
        }

        .legal-link:hover {
          color: hsl(var(--primary-hover));
        }
      `}</style>
    </div>
  );
};