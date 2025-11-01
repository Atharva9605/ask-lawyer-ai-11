import React, { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MessageContentProps {
  content: string;
  className?: string;
  showCopyButton?: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  className = '',
  showCopyButton = true 
}) => {
  const { toast } = useToast();

  // Enhanced regex patterns for better markdown support
  const patterns = useMemo(() => ({
    // Code blocks with language support (must be processed first)
    codeBlock: /```(\w+)?\n?([\s\S]*?)```/g,
    // Inline code
    inlineCode: /`([^`\n]+)`/g,
    // Bold with ++ or **
    boldPlus: /\+\+([^\+\n]+)\+\+/g,
    bold: /\*\*([^\*\n]+)\*\*/g,
    // Italic (but not inside bold)
    italic: /(?<!\*)\*([^\*\n]+)\*(?!\*)/g,
    // Headings
    h1: /^# (.+)$/gm,
    h2: /^## (.+)$/gm,
    h3: /^### (.+)$/gm,
    // Nested lists - capture indentation
    nestedList: /^([ \t]*)([-*+•]|\d+\.)\s+(.+)$/gm,
    // Blockquotes
    blockquote: /^>\s+(.+)$/gm,
    // Horizontal rule
    hr: /^[-*_]{3,}$/gm,
    // URLs
    url: /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/g,
    // Email
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    // Phone
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  }), []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied to clipboard',
        description: 'Message content has been copied.',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Escapes HTML special characters to prevent XSS
   */
  const escapeHtml = (text: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  };

  /**
   * Converts markdown-like text to safe HTML with proper formatting
   */
  const formatContent = (text: string): string => {
    if (!text || typeof text !== 'string') return '';

    // Normalize whitespace: trim lines and collapse multiple newlines
    let processed = text
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // Collapse 3+ newlines to 2

    // Store code blocks temporarily to prevent them from being processed
    const codeBlocks: string[] = [];
    processed = processed.replace(patterns.codeBlock, (match, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      const escapedCode = escapeHtml(code.trim());
      const langClass = lang ? ` language-${escapeHtml(lang)}` : '';
      codeBlocks.push(
        `<pre class="legal-code-block${langClass}"><code>${escapedCode}</code></pre>`
      );
      return placeholder;
    });

    // Store inline code temporarily
    const inlineCodes: string[] = [];
    processed = processed.replace(patterns.inlineCode, (match, code) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(`<code class="legal-inline-code">${escapeHtml(code)}</code>`);
      return placeholder;
    });

    // Escape remaining HTML after extracting code
    processed = escapeHtml(processed);

    // Bold with ++ (must come before regular bold)
    processed = processed.replace(patterns.boldPlus, '<strong class="font-semibold">$1</strong>');

    // Bold with ** (must come before italic)
    processed = processed.replace(patterns.bold, '<strong class="font-semibold">$1</strong>');

    // Italic
    processed = processed.replace(patterns.italic, '<em>$1</em>');

    // Headings (process before lists to avoid conflicts)
    processed = processed.replace(patterns.h1, '<h1 class="text-xl font-bold mt-5 mb-2">$1</h1>');
    processed = processed.replace(patterns.h2, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>');
    processed = processed.replace(patterns.h3, '<h3 class="text-base font-medium mt-3 mb-1">$1</h3>');

    // Blockquotes
    processed = processed.replace(patterns.blockquote, '<blockquote class="legal-blockquote">$1</blockquote>');

    // Horizontal rules
    processed = processed.replace(patterns.hr, '<hr class="legal-hr" />');

    // URLs (must come before emails)
    processed = processed.replace(patterns.url, (url) => {
      const safeUrl = url.replace(/javascript:/gi, ''); // Prevent JS injection
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="legal-link">${url}</a>`;
    });

    // Emails
    processed = processed.replace(patterns.email, (email) => {
      return `<a href="mailto:${email}" class="legal-link">${email}</a>`;
    });

    // Phone numbers
    processed = processed.replace(patterns.phone, (phone) => {
      const clean = phone.replace(/\D/g, '');
      return `<a href="tel:+${clean}" class="legal-link">${phone}</a>`;
    });

    // Process nested lists with proper indentation
    const lines = processed.split('\n');
    const listStack: Array<{ type: 'ul' | 'ol'; indent: number }> = [];
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^([ \t]*)([-*+•]|\d+\.)\s+(.+)$/);

      if (match) {
        const [, indent, marker, content] = match;
        const indentLevel = Math.floor(indent.length / 2); // 2 spaces = 1 level
        const isOrdered = /\d+\./.test(marker);
        const listType = isOrdered ? 'ol' : 'ul';

        // Close lists if we're at a lower indent level
        while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indentLevel) {
          const closingList = listStack.pop()!;
          processedLines.push(closingList.type === 'ul' ? '</ul>' : '</ol>');
        }

        // Open new list if needed
        if (listStack.length === 0 || listStack[listStack.length - 1].indent < indentLevel) {
          const listClass = listType === 'ul' 
            ? `legal-bullet-list legal-indent-${indentLevel}` 
            : `legal-numbered-list legal-indent-${indentLevel}`;
          processedLines.push(`<${listType} class="${listClass}">`);
          listStack.push({ type: listType, indent: indentLevel });
        }

        processedLines.push(`<li class="legal-list-item">${content}</li>`);
      } else {
        // Close all open lists when we hit a non-list line
        while (listStack.length > 0) {
          const closingList = listStack.pop()!;
          processedLines.push(closingList.type === 'ul' ? '</ul>' : '</ol>');
        }
        processedLines.push(line);
      }
    }

    // Close any remaining open lists
    while (listStack.length > 0) {
      const closingList = listStack.pop()!;
      processedLines.push(closingList.type === 'ul' ? '</ul>' : '</ol>');
    }

    processed = processedLines.join('\n');

    // Restore inline code
    inlineCodes.forEach((code, i) => {
      processed = processed.replace(`__INLINE_CODE_${i}__`, code);
    });

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      processed = processed.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Handle paragraphs - only split on 2+ consecutive newlines
    const paragraphs = processed.split(/\n{2,}/);
    processed = paragraphs
      .map((para) => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        
        // Don't wrap headings, lists, code blocks, or blockquotes in <p> tags
        if (
          trimmed.startsWith('<h') ||
          trimmed.startsWith('<ul') ||
          trimmed.startsWith('<ol') ||
          trimmed.startsWith('<pre') ||
          trimmed.startsWith('<blockquote') ||
          trimmed.startsWith('<hr')
        ) {
          return trimmed;
        }
        // Replace single newlines with <br> only if they're not already part of HTML
        const withBreaks = trimmed.replace(/\n/g, '<br>');
        return `<p class="mb-4">${withBreaks}</p>`;
      })
      .filter(p => p)
      .join('');

    return processed;
  };

  // Memoize formatted content to avoid re-processing on every render
  const formattedContent = useMemo(() => formatContent(content), [content]);

  return (
    <div className={`legal-message-content ${className}`}>
      <div
        className="legal-formatted-text text-[15px] leading-relaxed text-foreground"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />

      {/* Copy button */}
      {showCopyButton && content && (
        <div className="flex justify-end mt-3 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-xs h-6 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Copy message to clipboard"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      )}

      <style>{`
        .legal-code-block {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .legal-inline-code {
          background: rgba(148, 163, 184, 0.15);
          color: #e11d48;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875em;
        }

        .legal-link {
          color: #3b82f6;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }

        .legal-link:hover {
          color: #2563eb;
        }

        .legal-bullet-list,
        .legal-numbered-list {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
          line-height: 1.7;
        }

        .legal-numbered-list {
          list-style-type: decimal;
        }

        .legal-bullet-list {
          list-style-type: disc;
        }

        /* Nested list indentation */
        .legal-indent-0 {
          padding-left: 1.25rem;
        }

        .legal-indent-1 {
          padding-left: 2rem;
          list-style-type: circle;
        }

        .legal-indent-2 {
          padding-left: 2.75rem;
          list-style-type: square;
        }

        .legal-indent-3 {
          padding-left: 3.5rem;
          list-style-type: disc;
        }

        .legal-list-item {
          margin: 0.375rem 0;
          padding-left: 0.25rem;
          color: hsl(var(--foreground));
        }

        .legal-list-item strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .legal-blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #64748b;
        }

        .legal-hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 1.5rem 0;
        }

        :global(.dark) .legal-inline-code {
          background: rgba(148, 163, 184, 0.1);
          color: #fb7185;
        }

        :global(.dark) .legal-blockquote {
          color: #94a3b8;
        }

        :global(.dark) .legal-hr {
          border-top-color: #334155;
        }

        :global(.dark) .legal-code-block {
          background: #0f172a;
        }
      `}</style>
    </div>
  );
};

export default MessageContent;