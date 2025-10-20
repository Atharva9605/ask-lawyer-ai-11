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

  // Improved regex patterns
  const patterns = useMemo(() => ({
    // More comprehensive URL pattern
    url: /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/g,
    // More robust email pattern
    email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    // Better phone pattern with international support
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    // Code blocks with language support
    codeBlock: /```(\w+)?\n?([\s\S]*?)```/g,
    // Inline code
    inlineCode: /`([^`\n]+)`/g,
    // Bold
    bold: /\*\*([^\*\n]+)\*\*/g,
    // Italic (but not inside bold)
    italic: /(?<!\*)\*([^\*\n]+)\*(?!\*)/g,
    // Headings
    h1: /^# (.+)$/gm,
    h2: /^## (.+)$/gm,
    h3: /^### (.+)$/gm,
    // Unordered lists
    unorderedList: /^[\s]*[-*+]\s+(.+)$/gm,
    // Ordered lists
    orderedList: /^[\s]*\d+\.\s+(.+)$/gm,
    // Blockquotes
    blockquote: /^>\s+(.+)$/gm,
    // Horizontal rule
    hr: /^[-*_]{3,}$/gm,
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

    let processed = text;

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

    // Bold (must come before italic)
    processed = processed.replace(patterns.bold, '<strong>$1</strong>');

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

    // Lists - Process unordered lists
    const unorderedListItems: string[] = [];
    processed = processed.replace(patterns.unorderedList, (match, content) => {
      const placeholder = `__UL_ITEM_${unorderedListItems.length}__`;
      unorderedListItems.push(`<li class="legal-list-item">${content}</li>`);
      return placeholder;
    });

    // Lists - Process ordered lists
    const orderedListItems: string[] = [];
    processed = processed.replace(patterns.orderedList, (match, content) => {
      const placeholder = `__OL_ITEM_${orderedListItems.length}__`;
      orderedListItems.push(`<li class="legal-list-item">${content}</li>`);
      return placeholder;
    });

    // Group consecutive list items
    if (unorderedListItems.length > 0) {
      const ulPattern = new RegExp(`(__UL_ITEM_\\d+__\n?)+`, 'g');
      processed = processed.replace(ulPattern, (match) => {
        const items = match
          .split('\n')
          .filter(Boolean)
          .map((placeholder) => {
            const index = parseInt(placeholder.match(/\d+/)?.[0] || '0');
            return unorderedListItems[index];
          })
          .join('');
        return `<ul class="legal-bullet-list">${items}</ul>`;
      });
    }

    if (orderedListItems.length > 0) {
      const olPattern = new RegExp(`(__OL_ITEM_\\d+__\n?)+`, 'g');
      processed = processed.replace(olPattern, (match) => {
        const items = match
          .split('\n')
          .filter(Boolean)
          .map((placeholder) => {
            const index = parseInt(placeholder.match(/\d+/)?.[0] || '0');
            return orderedListItems[index];
          })
          .join('');
        return `<ol class="legal-numbered-list">${items}</ol>`;
      });
    }

    // Restore inline code
    inlineCodes.forEach((code, i) => {
      processed = processed.replace(`__INLINE_CODE_${i}__`, code);
    });

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      processed = processed.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Paragraphs - split by double newlines
    const paragraphs = processed.split(/\n\s*\n/);
    processed = paragraphs
      .map((para) => {
        // Don't wrap headings, lists, code blocks, or blockquotes in <p> tags
        if (
          para.trim().startsWith('<h') ||
          para.trim().startsWith('<ul') ||
          para.trim().startsWith('<ol') ||
          para.trim().startsWith('<pre') ||
          para.trim().startsWith('<blockquote') ||
          para.trim().startsWith('<hr')
        ) {
          return para;
        }
        // Replace single newlines with <br>
        const withBreaks = para.replace(/\n/g, '<br>');
        return `<p class="mb-3">${withBreaks}</p>`;
      })
      .join('');

    return processed;
  };

  // Memoize formatted content to avoid re-processing on every render
  const formattedContent = useMemo(() => formatContent(content), [content]);

  return (
    <div className={`legal-message-content ${className}`}>
      <div
        className="legal-formatted-text text-sm leading-relaxed text-slate-700 dark:text-slate-300"
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

      <style jsx>{`
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
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .legal-numbered-list {
          list-style-type: decimal;
        }

        .legal-bullet-list {
          list-style-type: disc;
        }

        .legal-list-item {
          margin: 0.25rem 0;
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
      `}</style>
    </div>
  );
};

export default MessageContent;