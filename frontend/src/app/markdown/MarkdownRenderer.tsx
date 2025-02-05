"use client";

import React from "react";
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-hot-toast';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
  
}

// Helper function to convert table to CSV
const tableToCSV = (table: HTMLTableElement): string => {
  const rows = Array.from(table.rows);
  return rows
    .map(row => {
      return Array.from(row.cells)
        .map(cell => `"${cell.textContent?.replace(/"/g, '""')}"`)
        .join(',');
    })
    .join('\n');
};

export function MarkdownRenderer({ content, className = '', isUser = false }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      className={`prose prose-invert max-w-none ${className}`}
      components={{
        // Headers with better contrast
        h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>,
        h2: ({children}) => <h2 className="text-xl font-bold mb-3 text-white">{children}</h2>,
        h3: ({children}) => <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>,
        
        // Paragraphs with better visibility
        p: ({children}) => <p className={`mb-4 ${isUser ? 'text-white' : 'text-zinc-200'}`}>{children}</p>,
        
        // Lists with better contrast
        ul: ({children}) => <ul className="list-disc pl-5 space-y-2 mb-4 text-white">{children}</ul>,
        ol: ({children}) => <ol className="list-decimal pl-5 space-y-2 mb-4 text-white">{children}</ol>,
        li: ({children}) => <li className="text-zinc-200">{children}</li>,

        // Code blocks with better styling
        code: ({ className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          return !isInline ? (
            <div className="relative group max-h-[500px] overflow-hidden">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(String(children));
                  toast.success('Code copied to clipboard');
                }}
                className="absolute right-2 top-2 z-10 bg-zinc-700 text-white px-2 py-1 rounded text-xs 
                         hover:bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Copy
              </button>
              <SyntaxHighlighter
                style={atomDark}
                language={match[1]}
                PreTag="div"
                className="rounded-md !mt-0 !mb-0"
                showLineNumbers={true}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="bg-zinc-700 text-zinc-200 rounded px-1 py-0.5" {...props}>
              {children}
            </code>
          );
        },

        // Blockquotes with better styling
        blockquote: ({children}) => (
          <blockquote className="pl-4 border-l-4 border-zinc-500 bg-zinc-800/50 p-4 rounded-r mb-4 text-zinc-200">
            {children}
          </blockquote>
        ),

        // Links with better visibility
        a: ({children, href}) => (
          <a 
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {children}
          </a>
        ),

        // Tables with better contrast
         // Tables with better styling
         table: ({children}) => (
          <div className="relative group overflow-x-auto my-4 max-h-[500px] border rounded-lg shadow-sm">
            <button
              onClick={(e) => {
                const table = (e.target as HTMLElement).closest('div')?.querySelector('table');
                if (table) {
                  const csv = tableToCSV(table);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'table-data.csv';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Table downloaded as CSV');
                }
              }}
              className="absolute right-2 top-2 z-10 bg-gray-700 text-white px-2 py-1 rounded text-xs 
                       hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Download CSV
            </button>
            <table className="min-w-full divide-y divide-gray-200">
              {children}
            </table>
          </div>
        ),
        thead: ({children}) => (
          <thead className="bg-gray-50 sticky top-0">
            {children}
          </thead>
        ),
        th: ({children}) => (
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {children}
          </th>
        ),
        td: ({children}) => (
          <td className="px-4 py-2 text-sm text-gray-500 overflow-hidden text-ellipsis">
            {children}
          </td>
        ),

      }}
      skipHtml
    >
      {content}
    </ReactMarkdown>
  );
} 