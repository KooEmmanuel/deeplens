"use client";

import { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';
import Marker from '@editorjs/marker';
import Quote from '@editorjs/quote';
import CodeTool from '@editorjs/code';
import Table from '@editorjs/table';
import Delimiter from '@editorjs/delimiter';
import SimpleImage from '@editorjs/simple-image';
import AIText from '@alkhipce/editorjs-aitext';
import { Download } from 'lucide-react';
import { NEXT_PUBLIC_API_URL } from "@/lib/config";
import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';  // Just import for side effects
import { TDocumentDefinitions, Style } from 'pdfmake/interfaces';

interface DocumentCanvasProps {
  isOpen: boolean;
  onResize: (width: number) => void;
}

export function DocumentCanvas({ isOpen, onResize }: DocumentCanvasProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const fetchDocument = async () => {
    try {
      console.log('Fetching latest document...');
      const response = await fetch(`${NEXT_PUBLIC_API_URL}/documents/latest`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Response error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('Fetched document data:', data);
      
      if (editorRef.current && data.content) {
        console.log('Rendering content to editor:', data.content);
        await editorRef.current.render(data.content);
        setLastSavedContent(JSON.stringify(data.content));
        setDocumentId(data.id);
      } else {
        console.log('No existing content or editor not ready');
        if (editorRef.current) {
          await editorRef.current.render({
            blocks: [{
              type: 'paragraph',
              data: {
                text: 'Start writing here...'
              }
            }]
          });
        }
      }
    } catch (error) {
      console.error('Detailed fetch error:', {
        error,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  };

  const saveDocument = async (content: any) => {
    try {
      const contentStr = JSON.stringify(content);
      console.log('Attempting to save document:', content);
      
      if (contentStr === lastSavedContent) {
        console.log('Content unchanged, skipping save');
        return;
      }

      const response = await fetch(`${NEXT_PUBLIC_API_URL}/documents/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: content.blocks,
          time: Date.now(),
          version: '2.28.2'
        })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(`Failed to save document: ${JSON.stringify(responseData)}`);
      }
      
      setDocumentId(responseData.id);
      setLastSavedContent(contentStr);
      console.log('Document saved successfully:', responseData);
    } catch (error) {
      console.error('Detailed save error:', {
        error,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  };

  const initEditor = () => {
    const editor = new EditorJS({
      holder: 'editorjs',
      placeholder: 'Type here to start writing...',
      tools: {
        header: {
          class: Header as any,
          config: {
            levels: [1, 2, 3],
            defaultLevel: 1,
          },
          inlineToolbar: true,
        },
        list: { class: List, inlineToolbar: true },
        checklist: { class: Checklist, inlineToolbar: true },
        marker: { class: Marker, inlineToolbar: true },
        quote: { 
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Enter quote text',
            captionPlaceholder: "Quote's author",
          }
        },
        code: { class: CodeTool, inlineToolbar: false },
        table: {
          class: Table as any,
          inlineToolbar: true,
          config: {
            rows: 2,
            cols: 3,
          }
        },
        delimiter: { class: Delimiter },
        simpleImage: { class: SimpleImage, inlineToolbar: true },
        aiText: { 
          class: AIText as any,
          config: {
            callback: (text: string) => {
              return new Promise<string>((resolve) => {
                setTimeout(() => {
                  resolve('AI: ' + text);
                }, 2000);
              });
            },
            placeholder: 'Start typing and wait for AI suggestions...',
            preserveBlank: false,
          },
          inlineToolbar: true,
        },
      },
      onChange: async () => {
        if (saveTimer) clearTimeout(saveTimer);
        const timer = setTimeout(async () => {
          const savedData = await editor.save();
          await saveDocument(savedData);
        }, 5000);
        setSaveTimer(timer);
      },
    });
    editorRef.current = editor;
  };

  const handleInsertContent = async (content: string) => {
    if (!editorRef.current) return;

    try {
      const currentData = await editorRef.current.save();
      const blocks = currentData.blocks || [];
      
      blocks.push({
        type: 'paragraph',
        data: {
          text: content
        }
      });

      await editorRef.current.render({ blocks });
      await saveDocument({ blocks });
      console.log('Content inserted successfully');
    } catch (error) {
      console.error('Insert error:', error);
    }
  };

  useEffect(() => {
    if (!editorRef.current) {
      initEditor();
    }
    fetchDocument();

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const containerRight = window.innerWidth;
      const newWidth = containerRight - e.clientX;
      
      if (newWidth > 300 && newWidth < 800) {
        setWidth(newWidth);
        onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  const convertEditorJSToDocDefinition = (data: any): TDocumentDefinitions => {
    const content: any[] = [];

    data.blocks.forEach((block: any) => {
      switch (block.type) {
        case "header":
          content.push({
            text: block.data.text,
            style: `header${block.data.level}`,
            margin: [0, 10, 0, 5]
          });
          break;
        case "paragraph":
          content.push({
            text: block.data.text,
            margin: [0, 5, 0, 5]
          });
          break;
        case "list":
          const items = block.data.items.map((item: string) => item);
          content.push({
            ul: items,
            margin: [0, 5, 0, 5]
          });
          break;
        case "checklist":
          const checklistItems = block.data.items.map((item: any) => 
            `${item.checked ? '☑' : '☐'} ${item.text}`
          );
          content.push({
            ul: checklistItems,
            margin: [0, 5, 0, 5]
          });
          break;
        case "quote":
          content.push({
            text: block.data.text,
            style: 'blockquote',
            margin: [20, 5, 20, 5]
          });
          if (block.data.caption) {
            content.push({
              text: `— ${block.data.caption}`,
              style: 'caption',
              margin: [20, 0, 20, 5]
            });
          }
          break;
        case "code":
          content.push({
            text: block.data.code,
            style: 'code',
            margin: [0, 5, 0, 5]
          });
          break;
        case "table":
          content.push({
            table: {
              body: block.data.content
            },
            margin: [0, 5, 0, 5]
          });
          break;
        case "delimiter":
          content.push({
            text: '* * *',
            alignment: 'center',
            margin: [0, 10, 0, 10]
          });
          break;
      }
    });

    return {
      content,
      styles: {
        header1: { fontSize: 24, bold: true } as Style,
        header2: { fontSize: 20, bold: true } as Style,
        header3: { fontSize: 16, bold: true } as Style,
        blockquote: { italics: true, margin: [20, 0, 20, 0] } as Style,
        caption: { italics: true, fontSize: 12 } as Style,
        code: { font: 'Courier', background: '#f5f5f5', padding: 5 } as Style
      },
      defaultStyle: {
        fontSize: 12,
        font: 'Helvetica'
      }
    };
  };

  const handleDownload = async () => {
    if (!editorRef.current) return;
    try {
      const savedData = await editorRef.current.save();
      const docDefinition = convertEditorJSToDocDefinition(savedData);
      pdfMake.createPdf(docDefinition).download('document.pdf');
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleInsertToCanvas = async (content: string) => {
        if (!editorRef.current) return;
        try {
          const currentData = await editorRef.current.save();
          const blocks = currentData.blocks || [];
          blocks.push({
            type: 'paragraph',
            data: { text: content }
          });
          await editorRef.current.render({ blocks });
          await saveDocument({ blocks });
        } catch (error) {
          console.error('Insert error:', error);
        }
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: isOpen ? `${width}px` : '0' }}
      className={`fixed right-0 top-0 h-full bg-zinc-900 border-l border-zinc-800 transition-all duration-300 ease-in-out z-50 ${
        !isOpen && 'w-0'
      }`}
    >
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-[#392132] group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute left-0 top-0 w-1 h-full opacity-0 group-hover:opacity-100 bg-[#392132]" />
      </div>

      <div className="flex justify-between items-center p-4 border-b border-zinc-800">
        <h2 className="text-zinc-200 font-semibold">Document Editor</h2>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Download Document"
        >
          <Download size={20} />
        </button>
      </div>

      <div className="p-4 h-[calc(100%-4rem)] overflow-y-auto">
        <div 
          id="editorjs" 
          className={`prose prose-invert max-w-none ${!isOpen && 'hidden'}`}
        />
      </div>
    </div>
  );
} 