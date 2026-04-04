'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Sparkles, Code, BookOpen, PenTool, Trash2, ChevronRight, Maximize2, Minimize2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  title?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  diagram?: DiagramData;
}

const SketchCanvas = ({ data }: { data: DiagramData }) => {
  // Helper for sketchy lines - using a pseudo-random deterministic offset based on coordinates
  const getSketchyPath = (x1: number, y1: number, x2: number, y2: number) => {
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    const seedX = x1 + x2;
    const seedY = y1 + y2;
    
    const midX = (x1 + x2) / 2 + (pseudoRandom(seedX) - 0.5) * 10;
    const midY = (y1 + y2) / 2 + (pseudoRandom(seedY) - 0.5) * 10;
    return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
  };

  return (
    <div className="w-full aspect-video bg-white border-2 border-black rounded-lg relative overflow-hidden manga-panel p-4 my-4">
      <div className="absolute top-2 left-2 font-mono text-xs uppercase opacity-50">Sensei&apos;s Sketch: {data.title || 'Concept'}</div>
      <svg className="w-full h-full" viewBox="0 0 400 200">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M 0 0 L 10 3.5 L 0 7 Z" fill="#2d2d2d" />
          </marker>
        </defs>
        {data.edges.map((edge, i) => {
          const from = data.nodes.find(n => n.id === edge.from);
          const to = data.nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <g key={i}>
              <path
                d={getSketchyPath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke="#2d2d2d"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                strokeDasharray="5,3"
              />
              {edge.label && (
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 10} fontSize="8" textAnchor="middle" fill="#666" className="font-mono italic">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        {data.nodes.map((node) => (
          <g key={node.id}>
            <path
              d={`M ${node.x - 25} ${node.y - 15} 
                 C ${node.x - 20} ${node.y - 18}, ${node.x + 20} ${node.y - 18}, ${node.x + 25} ${node.y - 15}
                 C ${node.x + 28} ${node.y - 10}, ${node.x + 28} ${node.y + 10}, ${node.x + 25} ${node.y + 15}
                 C ${node.x + 20} ${node.y + 18}, ${node.x - 20} ${node.y + 18}, ${node.x - 25} ${node.y + 15}
                 C ${node.x - 28} ${node.y + 10}, ${node.x - 28} ${node.y - 10}, ${node.x - 25} ${node.y - 15} Z`}
              fill="white"
              stroke="#2d2d2d"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" className="font-bold select-none font-display">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const DSA_PATTERNS = [
  {
    category: "Arrays & Hashing",
    problems: ["Two Sum", "Contains Duplicate", "Valid Anagram", "Group Anagrams", "Top K Frequent Elements", "Product of Array Except Self", "Longest Consecutive Sequence"]
  },
  {
    category: "Two Pointers",
    problems: ["Valid Palindrome", "3Sum", "Container With Most Water"]
  },
  {
    category: "Sliding Window",
    problems: ["Best Time to Buy & Sell Stock", "Longest Substring Without Repeating"]
  },
  {
    category: "Stack",
    problems: ["Valid Parentheses"]
  },
  {
    category: "Binary Search",
    problems: ["Find Minimum in Rotated Sorted Array"]
  },
  {
    category: "Linked List",
    problems: ["Reverse Linked List", "Merge Two Sorted Lists", "Linked List Cycle"]
  },
  {
    category: "Trees",
    problems: ["Invert Binary Tree", "Maximum Depth of Binary Tree"]
  },
  {
    category: "1-D Dynamic Programming",
    problems: ["Climbing Stairs", "House Robber"]
  }
];

export default function DSATeacher() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Konnichiwa! I am your DSA Sensei. 🖋️\n\nI can help you master algorithms and data structures with a touch of manga style. What shall we tackle today? Binary Search? Dynamic Programming? Or perhaps a tricky LeetCode problem?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mode, setMode] = useState<'chat' | 'notebook'>('chat');
  const [code, setCode] = useState('// Write your algorithm here...\nfunction solve() {\n  \n}');
  const [feedback, setFeedback] = useState<{ line: number; text: string; type: 'info' | 'error' | 'success' }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const [mood, setMood] = useState<'neutral' | 'happy' | 'thinking' | 'serious'>('neutral');

  const getMoodEmoji = () => {
    switch (mood) {
      case 'happy': return '✨';
      case 'thinking': return '🤔';
      case 'serious': return '⚔️';
      default: return '🖋️';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setMood('thinking');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages, userMessage].map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: `You are "DSA Sensei", an expert Data Structures and Algorithms teacher with a personality inspired by wise manga mentors. 
          Your style is encouraging, slightly dramatic, and highly visual.
          Use Markdown for formatting. 
          
          CRITICAL: You have a special ability to generate sketches. 
          If you want to show a diagram (like a tree, graph, or array state), you MUST include a JSON block at the end of your message wrapped in <sketch> tags.
          The JSON must follow this structure:
          {
            "title": "Diagram Title",
            "nodes": [{"id": "1", "label": "Node 1", "x": 50, "y": 50}, ...],
            "edges": [{"from": "1", "to": "2", "label": "edge label"}]
          }
          Keep coordinates within x: 0-400, y: 0-200.
          
          When explaining code, provide clean, optimized solutions.
          Incorporate "sketchy" descriptions or ASCII art diagrams where helpful.
          Keep your tone like a teacher who loves sketching on a whiteboard.
          Use emojis like 🖋️, 📜, 💡, ⚔️, 🧠.`,
        }
      });

      const text = response.text || "";
      let content = text;
      let diagram: DiagramData | undefined;

      const sketchMatch = text.match(/<sketch>([\s\S]*?)<\/sketch>/);
      if (sketchMatch) {
        try {
          diagram = JSON.parse(sketchMatch[1]);
          content = text.replace(/<sketch>[\s\S]*?<\/sketch>/, '').trim();
        } catch (e) {
          console.error("Failed to parse sketch JSON", e);
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: content || "Forgive me, student. My thoughts are clouded. Could you repeat that?",
        diagram
      };
      setMessages(prev => [...prev, assistantMessage]);
      setMood(content.length > 200 ? 'serious' : 'happy');
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Gomen! Something went wrong in my meditation. Let's try again." }]);
      setMood('neutral');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeCode = async () => {
    setIsLoading(true);
    setFeedback([]);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Analyze this code and provide feedback for specific lines. Output ONLY a JSON array of objects like {"line": 1, "text": "Good start!", "type": "success"}. Types can be info, error, success.\n\nCODE:\n${code}` }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.INTEGER },
                text: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['info', 'error', 'success'] }
              },
              required: ['line', 'text', 'type']
            }
          }
        }
      });
      const data = JSON.parse(response.text || "[]");
      setFeedback(data);
    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r-4 border-black flex-col hidden md:flex overflow-hidden"
      >
        <div className="p-6 border-b-4 border-black bg-yellow-50">
          <h2 className="text-xl font-black uppercase italic tracking-tighter">Scroll of History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button 
            onClick={() => setMode('chat')}
            className={cn(
              "w-full p-3 border-2 border-black manga-panel flex items-center gap-2 transition-all",
              mode === 'chat' ? "bg-yellow-200" : "bg-white hover:bg-zinc-50"
            )}
          >
            <Bot size={16} />
            <span className="text-sm font-bold">Sensei Chat</span>
          </button>
          <button 
            onClick={() => setMode('notebook')}
            className={cn(
              "w-full p-3 border-2 border-black manga-panel flex items-center gap-2 transition-all",
              mode === 'notebook' ? "bg-yellow-200" : "bg-white hover:bg-zinc-50"
            )}
          >
            <PenTool size={16} />
            <span className="text-sm font-bold">Notebook Mode</span>
          </button>
          <div className="pt-4 border-t-2 border-black opacity-30 text-[10px] font-black uppercase">Pattern-Wise Training</div>
          {DSA_PATTERNS.map((pattern, i) => (
            <div key={i} className="space-y-2">
              <div className="text-xs font-black uppercase bg-zinc-100 p-1 border-y-2 border-black">{pattern.category}</div>
              {pattern.problems.map((prob, j) => (
                <div 
                  key={j} 
                  onClick={() => {
                    setInput(`Teach me how to solve "${prob}" using the ${pattern.category} pattern.`);
                    setMode('chat');
                  }}
                  className="p-2 border-2 border-black manga-panel cursor-pointer hover:bg-zinc-50 flex items-center gap-2 group ml-2 text-xs"
                >
                  <BookOpen size={14} className="group-hover:text-blue-600 shrink-0" />
                  <span className="font-bold truncate">{prob}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="p-4 border-t-4 border-black bg-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-black bg-white flex items-center justify-center font-black">R</div>
            <div>
              <p className="text-xs font-black uppercase">Student</p>
              <p className="text-[10px] font-mono opacity-50">Rank: Novice Coder</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="p-4 border-b-4 border-black bg-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block">
              <Maximize2 size={24} />
            </button>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase">DSA SENSEI</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setMessages([{
                  role: 'assistant',
                  content: "The slate is clean. A new journey begins! What's our first challenge?",
                }]);
              }}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors border-2 border-transparent hover:border-black"
              title="Clear Scroll"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={() => setMode('chat')}
              className={cn("px-4 py-1 border-2 border-black font-black text-xs uppercase rounded", mode === 'chat' ? "bg-black text-white" : "bg-white")}
            >
              Chat
            </button>
            <button 
              onClick={() => setMode('notebook')}
              className={cn("px-4 py-1 border-2 border-black font-black text-xs uppercase rounded", mode === 'notebook' ? "bg-black text-white" : "bg-white")}
            >
              Notebook
            </button>
          </div>
        </header>

        {mode === 'chat' ? (
          <>
            {/* Chat Scroll Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 scroll-smooth"
            >
              <div className="max-w-4xl mx-auto space-y-10">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-4",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-4 border-black shrink-0 manga-panel relative",
                        msg.role === 'user' ? "bg-blue-200" : "bg-yellow-200"
                      )}>
                        {msg.role === 'user' ? <User size={24} /> : <Bot size={24} />}
                        {msg.role === 'assistant' && (
                          <div className="absolute -top-1 -right-1 bg-white border-2 border-black rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            {getMoodEmoji()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className={cn(
                          "p-6 manga-panel border-4 border-black relative",
                          msg.role === 'user' ? "bg-blue-50" : "bg-white"
                        )}>
                          <div className="prose prose-sm md:prose-base max-w-none 
                            prose-headings:font-black prose-headings:italic prose-headings:uppercase
                            prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:border-2 prose-pre:border-black 
                            prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded
                            prose-strong:text-black prose-strong:font-black">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          
                          {msg.diagram && <SketchCanvas data={msg.diagram} />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-200 border-4 border-black animate-bounce" />
                    <div className="p-4 bg-white border-4 border-black rounded-lg italic font-mono">
                      Sensei is sketching...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 border-t-4 border-black bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="relative flex items-end gap-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="What algorithm shall we conquer today?"
                      className="w-full p-4 pr-16 border-4 border-black rounded-xl bg-white focus:outline-none focus:ring-0 text-lg font-medium placeholder:italic manga-panel min-h-[100px] max-h-[300px] resize-none"
                    />
                    <div className="absolute top-2 right-4 flex gap-2">
                      <button onClick={() => setMode('notebook')} className="p-1 hover:bg-zinc-100 rounded" title="Open Notebook">
                        <Code size={20} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="p-6 bg-black text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 manga-panel"
                  >
                    <Send size={32} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-6xl mx-auto w-full overflow-hidden">
              {/* Code Editor Panel */}
              <div className="flex-1 flex flex-col manga-panel border-4 border-black bg-white overflow-hidden">
                <div className="p-3 border-b-4 border-black bg-zinc-900 text-white flex justify-between items-center">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono opacity-50">solution.js</span>
                  <button 
                    onClick={analyzeCode}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1 bg-white text-black rounded font-black text-[10px] uppercase hover:bg-yellow-200 transition-colors"
                  >
                    <Play size={12} /> Run Analysis
                  </button>
                </div>
                <div className="flex-1 relative font-mono text-sm overflow-hidden flex">
                  <div className="w-12 bg-zinc-100 border-r-2 border-black flex flex-col items-center py-4 text-zinc-400 select-none">
                    {code.split('\n').map((_, i) => (
                      <div key={i} className="h-6 leading-6">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 p-4 bg-white focus:outline-none resize-none leading-6 whitespace-pre overflow-auto"
                    spellCheck={false}
                  />
                  
                  {/* Inline Feedback */}
                  <AnimatePresence>
                    {feedback.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "absolute right-4 p-2 border-2 border-black rounded shadow-sm text-xs max-w-[200px] z-10",
                          f.type === 'error' ? "bg-red-50" : f.type === 'success' ? "bg-green-50" : "bg-blue-50"
                        )}
                        style={{ top: `${(f.line - 1) * 24 + 16}px` }}
                      >
                        <div className="flex items-center gap-1 font-bold mb-1">
                          {f.type === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                          Line {f.line}
                        </div>
                        {f.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sensei's Notebook Panel */}
              <div className="w-full md:w-80 flex flex-col gap-4">
                <div className="manga-panel border-4 border-black bg-yellow-50 p-6 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-black uppercase italic border-b-2 border-black pb-2 mb-4 flex items-center gap-2">
                    <PenTool size={20} /> Sensei&apos;s Notes
                  </h3>
                  <div className="space-y-4 text-sm leading-relaxed">
                    <p className="font-bold italic">&quot;A true master understands the complexity before writing the first line.&quot;</p>
                    <div className="p-3 bg-white border-2 border-black rounded relative">
                      <div className="absolute -top-2 -left-2 bg-black text-white px-2 py-0.5 text-[8px] font-black">TIP</div>
                      Focus on the base case first. What happens when the input is empty?
                    </div>
                    <div className="p-3 bg-white border-2 border-black rounded relative">
                      <div className="absolute -top-2 -left-2 bg-black text-white px-2 py-0.5 text-[8px] font-black">HINT</div>
                      Could you use a Hash Map to optimize this to O(n)?
                    </div>
                  </div>
                </div>
                <div className="manga-panel border-4 border-black bg-white p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase">Complexity</span>
                    <span className="text-[10px] font-mono">O(N²)</span>
                  </div>
                  <div className="h-2 bg-zinc-100 border-2 border-black rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 w-[70%]" />
                  </div>
                  <p className="text-[8px] mt-1 opacity-50 uppercase">Time complexity is high. Seek optimization!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Overlay for Manga Style */}
      <div className="fixed inset-0 pointer-events-none border-[12px] border-black z-50 mix-blend-multiply opacity-10" />
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 z-40" />
    </div>
  );
}
