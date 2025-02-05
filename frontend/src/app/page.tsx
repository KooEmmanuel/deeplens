"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Send, FileText, Menu, X, MoreVertical, Trash2, Copy, Download, ChevronDown, ChevronUp, Settings, MessageSquare, Plus, LayoutPanelLeft, FileInput, PanelRightOpen } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import TextareaAutosize from 'react-textarea-autosize';
import { BounceLoader } from "react-spinners";
import { motion } from "framer-motion";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { NEXT_PUBLIC_API_URL } from "@/lib/config";
import { DocumentCanvas } from '@/components/DocumentCanvas';
import EditorJS from '@editorjs/editorjs';

type Message = {
  role: string;
  content: string;
  sources?: Array<{ content: string; similarity: number }>;
};

// Add this helper function at the top of your component
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [documents, setDocuments] = useState<Array<{ name: string; createdAt: string }>>([]);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<number[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedDocumentName, setSelectedDocumentName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-r1');
  const [activeTab, setActiveTab] = useState<'conversations' | 'documents'>('conversations');
  const [conversations, setConversations] = useState<Array<{id: number, messages: Message[]}>>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const editorRef = useRef<EditorJS | null>(null);

  const initialPrompts = [
    {
      title: "Document Analysis",
      prompt: "Can you analyze the main topics in this document?"
    },
    {
      title: "Key Points",
      prompt: "What are the key points from this document?"
    },
    {
      title: "Summary",
      prompt: "Can you provide a brief summary of this document?"
    },
    {
      title: "Questions",
      prompt: "What are some important questions I should ask about this content?"
    }
  ];

  const handleFileUpload = async (acceptedFiles: File[]) => {
    try {
      setUploadLoading(true);
      setUploadProgress("Uploading document...");
      
      const formData = new FormData();
      formData.append("file", acceptedFiles[0]);

      const response = await fetch(`${NEXT_PUBLIC_API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      
      // Only add to documents list if it's a new document
      if (!data.isExisting) {
        const newDoc = {
          name: acceptedFiles[0].name,
          createdAt: new Date().toISOString()
        };
        setDocuments(prev => [...prev, newDoc]);
      }
      
      setSelectedDocumentName(acceptedFiles[0].name);
      toast.success(data.isExisting ? "Document updated successfully!" : "Document uploaded successfully!");
      
      // If we're in the documents tab, switch to it
      setActiveTab('documents');
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploadLoading(false);
      setUploadProgress(null);
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: handleFileUpload,
    noClick: true, // Prevent automatic opening on click
    multiple: false // Only allow single file upload
  });

  // Load conversation history with proper error handling
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch(`${NEXT_PUBLIC_API_URL}/conversations`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setConversations(data);
          if (data.length > 0) {
            setMessages(data[0].messages);
            setConversationId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
        setConversations([]);
      }
    };
    
    loadConversations();
  }, []);

  // Load documents with proper error handling
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${NEXT_PUBLIC_API_URL}/documents`);
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        const data = await response.json();
        console.log('Documents data:', data);
        
        // Ensure documents is always an array
        setDocuments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load documents:', error);
        setDocuments([]);
      }
    };
    
    loadDocuments();
  }, []);

  // Update the settings useEffect
  useEffect(() => {
    const storage = getLocalStorage();
    if (storage) {
      const savedApiKey = storage.getItem('openai_api_key') || '';
      const savedModel = storage.getItem('selected_model') || 'deepseek-r1';
      
      setApiKey(savedApiKey);
      setSelectedModel(savedModel);
    }
  }, []);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node) && 
          showSidebar) {
        setShowSidebar(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSidebar]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    console.log("Sending message:", inputValue);
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    
    // Add the user's message to the current conversation
    setMessages(prev => [...prev, {
      role: "user",
      content: userMessage
    }]);

    try {
      setLoading(true);
      setIsTyping(true);
      
      const storage = getLocalStorage();
      
      // Include the current conversationId if it exists
      const payload = {
        message: userMessage,
        conversation_id: conversationId,  // This is key - we keep the same ID for the entire conversation
        document_name: selectedDocumentName,
        api_key: storage?.getItem('openai_api_key'),
        selected_model: storage?.getItem('selected_model') || 'deepseek-coder'
      };
      console.log("Request payload:", payload);

      const response = await fetch(`${NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send message');
      }

      const data = await response.json();
      console.log("API response:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        sources: data.sources
      }]);

      // Only update conversationId if it's not already set
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsTyping(false);
      toast.error((error as Error).message || "Failed to send message");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (name: string) => {
    try {
      const response = await fetch(`${NEXT_PUBLIC_API_URL}/documents/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete document');
      
      setDocuments(docs => docs.filter(doc => doc.name !== name));
      setSelectedDocumentName(null);
      toast.success('Document deleted successfully');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleDeleteAllConversations = async () => {
    try {
      const response = await fetch(`${NEXT_PUBLIC_API_URL}/conversations`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete conversations');
      
      setMessages([]);
      setConversationId(null);
      toast.success('Conversations cleared');
    } catch (error) {
      toast.error('Failed to clear conversations');
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleDownloadMessage = (content: string, role: string) => {
    try {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${role}-message-${new Date().toISOString()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Message downloaded');
    } catch (error) {
      toast.error('Failed to download message');
    }
  };

  const toggleReasoning = (index: number) => {
    setExpandedReasoning(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const extractReasoning = (content: string) => {
    if (!content) return { reasoning: null, mainContent: '' };
    
    // Look for content between think tags, but preserve the content structure
    const thinkMatch = content.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)/);
    
    if (thinkMatch) {
      // Return the reasoning without the tags, and the rest of the content
      return {
        reasoning: thinkMatch[1].trim(),
        mainContent: thinkMatch[2].trim() || content // fallback to full content if no main content
      };
    }
    
    // If no think tags found, return full content as mainContent
    return {
      reasoning: null,
      mainContent: content
    };
  };

  const createNewConversation = async () => {
    try {
      // Clear the current messages and conversation ID
      setMessages([]);
      setConversationId(null);
      setSelectedDocumentName(null);  // Optional: clear selected document as well
      toast.success('New conversation started');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleInsertToCanvas = (content: string) => {
    if (typeof window !== 'undefined' && (window as any).handleInsertToCanvas) {
      (window as any).handleInsertToCanvas(content);
      setShowCanvas(true);
      console.log('Inserting content:', content);
    } else {
      console.error('Insert handler not available');
    }
  };

  return (
    <div className="flex h-screen relative">
      <div 
        className="flex-1 transition-all duration-300"
        style={{ 
          marginRight: showCanvas ? `${canvasWidth}px` : '0'
        }}
      >
        <div className="flex h-screen bg-[#1a1a1a] rounded-xl shadow-lg m-5 border-2 border-[#392132]">
          {/* Sidebar - Add ref */}
          <div 
            ref={sidebarRef}
            className={`
              fixed left-0 top-0 bottom-0 w-80 bg-zinc-900 border-r border-zinc-800 
              transition-transform duration-300 ease-in-out z-50
              ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header with Tabs */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={30} 
                    height={30}
                    className="rounded-lg"
                  />
                  <button 
                    onClick={() => setShowSidebar(false)}
                    className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-zinc-800 rounded-lg">
                  <button
                    onClick={() => setActiveTab('conversations')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md transition-all duration-200 ${
                      activeTab === 'conversations' 
                        ? 'bg-zinc-700 text-[#4ECDC4] shadow-lg' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
                    }`}
                  >
                    <MessageSquare size={18} />
                    <span className="text-sm font-medium">Chats</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md transition-all duration-200 ${
                      activeTab === 'documents' 
                        ? 'bg-zinc-700 text-[#4ECDC4] shadow-lg' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750'
                    }`}
                  >
                    <FileText size={18} />
                    <span className="text-sm font-medium">Docs</span>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {/* New Conversation/Document Button */}
                  <button
                    onClick={activeTab === 'conversations' ? createNewConversation : open}
                    disabled={uploadLoading}
                    className={`
                      w-full flex items-center gap-2 p-3 rounded-lg 
                      ${uploadLoading ? 'bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-750'} 
                      text-zinc-300 hover:text-white transition-colors 
                      border border-zinc-700 hover:border-[#4ECDC4]
                      ${uploadLoading ? 'cursor-wait' : 'cursor-pointer'}
                    `}
                  >
                    {uploadLoading ? (
                      <>
                        <BounceLoader size={18} color="#4ECDC4" />
                        <span className="text-sm font-medium">{uploadProgress}</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span className="text-sm font-medium">
                          New {activeTab === 'conversations' ? 'Chat' : 'Document'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Hidden dropzone input */}
                  <div className="hidden">
                    <div {...getRootProps()}>
                      <input {...getInputProps()} />
                    </div>
                  </div>

                  {activeTab === 'conversations' ? (
                    // Conversations List
                    conversations.map((conv) => (
                      <div 
                        key={conv.id}
                        onClick={() => {
                          setConversationId(conv.id);
                          setMessages(conv.messages);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200
                          ${conversationId === conv.id 
                            ? 'bg-zinc-700 border-2 border-[#4ECDC4] shadow-lg' 
                            : 'bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600'
                          }
                          group relative
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-zinc-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-100 truncate">
                              {conv.messages[0]?.content || 'New Chat'}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {conv.messages.length} messages
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Documents List
                    documents.map((doc) => (
                      <div 
                        key={doc.name}
                        onClick={() => setSelectedDocumentName(doc.name)}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200
                          ${selectedDocumentName === doc.name 
                            ? 'bg-zinc-700 border-2 border-[#4ECDC4] shadow-lg' 
                            : 'bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600'
                          }
                          group relative
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-zinc-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-100 truncate">{doc.name}</p>
                            <p className="text-xs text-zinc-400">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-zinc-800">
                <button 
                  onClick={() => activeTab === 'conversations' ? handleDeleteAllConversations() : null}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="text-sm">Clear {activeTab === 'conversations' ? 'All Chats' : 'All Docs'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Remove the space on the left */}
          <div className="flex-1 flex flex-col h-full relative">
            {/* Header with controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-full hover:bg-zinc-700 transition-colors"
              >
                <Menu size={20} className="text-zinc-400" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Settings"
                >
                  <Settings size={20} />
                </button>
                <button
                  className="p-2 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg"
                  onClick={() => setShowCanvas(!showCanvas)}
                  title="Open Canvas"
                >
                  <PanelRightOpen size={20} />
                </button>
              </div>
            </div>

            {/* Main chat area */}
            <main className="flex-1 overflow-y-auto p-4 pt-16">
              <div className="max-w-3xl mx-auto">
                {messages && messages.length === 0 ? (
                  // Initial prompts section
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {initialPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setInputValue(prompt.prompt)}
                        className="p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-left"
                      >
                        <h3 className="font-medium text-zinc-200 mb-2">{prompt.title}</h3>
                        <p className="text-sm text-zinc-400">{prompt.prompt}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  // Messages section
                  <div className="space-y-4 mb-4">
                    {messages && messages.map((message, index) => {
                      const { reasoning, mainContent } = extractReasoning(message.content);
                      
                      return (
                        <div
                          key={index}
                          className={`relative group p-4 rounded-lg ${
                            message.role === "user" ? "ml-auto bg-zinc-700" : "bg-zinc-800"
                          }`}
                        >
                          {/* Message Actions */}
                          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleCopyMessage(message.content)}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Copy Message"
                              >
                                <Copy size={20} />
                              </button>
                              <button
                                onClick={() => handleDownloadMessage(message.content, message.role)}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Download Message"
                              >
                                <Download size={20} />
                              </button>
                              <button
                                onClick={() => handleInsertToCanvas(message.content)}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Insert to Canvas"
                              >
                                <FileInput size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="pr-16">
                            {reasoning && message.role === "assistant" && (
                              <div className="mb-4">
                                <button
                                  onClick={() => toggleReasoning(index)}
                                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-2"
                                >
                                  {expandedReasoning.includes(index) ? (
                                    <ChevronUp size={16} />
                                  ) : (
                                    <ChevronDown size={16} />
                                  )}
                                  Reasoning
                                </button>
                                {expandedReasoning.includes(index) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-zinc-900 rounded-lg p-3 text-sm text-zinc-400"
                                  >
                                    {/* Additional reasoning actions */}
                                    <div className="flex justify-end gap-2 mb-2">
                                      <button
                                        onClick={() => handleCopyMessage(reasoning)}
                                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Copy Reasoning"
                                      >
                                        <Copy size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadMessage(reasoning, "reasoning")}
                                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                                        title="Download Reasoning"
                                      >
                                        <Download size={16} />
                                      </button>
                                    </div>
                                    <MarkdownRenderer content={reasoning} />
                                  </motion.div>
                                )}
                              </div>
                            )}
                            <MarkdownRenderer 
                              content={mainContent}
                              isUser={message.role === "user"}
                            />
                            
                            {/* Sources Section */}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-zinc-700">
                                <p className="text-sm text-zinc-400 mb-2">Sources:</p>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.slice(0, 3).map((source, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        setSelectedSource(source.content);
                                        setShowSourceModal(true);
                                      }}
                                      className="text-sm px-3 py-1 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                                    >
                                      Source {idx + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="p-4 rounded-lg bg-zinc-800 text-zinc-100 max-w-[80%]">
                        <BounceLoader size={24} color="#9ca3af" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>

            {/* Input area */}
            <div className="p-4 mx-auto w-full max-w-3xl">
              <div className="relative bg-zinc-800 rounded-lg">
                <TextareaAutosize
                  minRows={1}
                  maxRows={5}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full pr-24 pl-4 py-3 rounded-lg bg-zinc-800 text-zinc-100 border-none focus:ring-0 resize-none placeholder-zinc-500"
                  placeholder="Ask a question..."
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <button 
                    onClick={open}
                    className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors relative"
                    title="Upload document"
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BounceLoader size={24} color="#9ca3af" />
                      </div>
                    ) : (
                      <Upload size={20} />
                    )}
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    disabled={loading || !inputValue.trim()}
                    className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
              
              {/* Copyright Footer */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex justify-center items-center mt-4"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.02, 1],
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-sm text-center"
                >
                  <span className="text-zinc-500">© 2024 </span>
                  <span 
                    className="font-semibold bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#45B7D1] text-transparent bg-clip-text"
                    style={{
                      fontFamily: "'Playfair Display', serif"
                    }}
                  >
                    Koo Emma
                  </span>
                  <span className="text-zinc-500"> • All rights reserved</span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Source Modal */}
        <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl [&>button]:text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">Source Document</DialogTitle>
            </DialogHeader>
            <ScrollArea className="p-4 max-h-[80vh]">
              <div className="prose prose-invert max-w-none">
                {selectedSource && <MarkdownRenderer content={selectedSource} />}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Settings Modal */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="bg-zinc-900 border-zinc-800 [&>button]:text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-white">Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">OpenAI API Key</label>
                <Input
                  type="password"
                  value={apiKey || (getLocalStorage()?.getItem('openai_api_key') || '')}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Model Selection</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="deepseek-r1">Deepseek R1</SelectItem>
                    <SelectItem value="deepseek-r1:1.5b">Deepseek R1 1.5B</SelectItem>
                    <SelectItem value="qwen">Qwen 4B</SelectItem>
                    {apiKey && <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>}
                    {apiKey && <SelectItem value="gpt-4o">GPT-4o</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  const storage = getLocalStorage();
                  if (storage) {
                    storage.setItem('openai_api_key', apiKey);
                    storage.setItem('selected_model', selectedModel);
                    setShowSettings(false);
                    toast.success('Settings saved successfully');
                  }
                }}
              >
                Save Settings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DocumentCanvas 
        isOpen={showCanvas} 
        onResize={(width) => setCanvasWidth(width)}
      />
    </div>
  );
}
