'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, BookOpen, PenTool, Trash2, Play, Code2, MessageSquare, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';

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

const DSA_PATTERNS = [
  {
    category: "Arrays & Hashing",
    problems: ["Two Sum", "Contains Duplicate", "Valid Anagram", "Group Anagrams", "Top K Frequent Elements", "Product of Array Except Self", "Longest Consecutive Sequence", "Decode the Slanted Ciphertext"]
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

const PROBLEM_INFO: Record<string, { params: string[], example?: string }> = {
  "Two Sum": { params: ["nums", "target"], example: "nums = [2,7,11,15], target = 9 -> [0,1]" },
  "Contains Duplicate": { params: ["nums"], example: "nums = [1,2,3,1] -> true" },
  "Valid Anagram": { params: ["s", "t"], example: "s = \"anagram\", t = \"nagaram\" -> true" },
  "Group Anagrams": { params: ["strs"], example: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"] -> [[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]" },
  "Top K Frequent Elements": { params: ["nums", "k"], example: "nums = [1,1,1,2,2,3], k = 2 -> [1,2]" },
  "Product of Array Except Self": { params: ["nums"], example: "nums = [1,2,3,4] -> [24,12,8,6]" },
  "Longest Consecutive Sequence": { params: ["nums"], example: "nums = [100,4,200,1,3,2] -> 4" },
  "Decode the Slanted Ciphertext": { params: ["encodedText", "rows"], example: "encodedText = \"coding\", rows = 1 -> \"coding\"" },
  "Valid Palindrome": { params: ["s"], example: "s = \"A man, a plan, a canal: Panama\" -> true" },
  "3Sum": { params: ["nums"], example: "nums = [-1,0,1,2,-1,-4] -> [[-1,-1,2],[-1,0,1]]" },
  "Container With Most Water": { params: ["height"], example: "height = [1,8,6,2,5,4,8,3,7] -> 49" },
  "Best Time to Buy & Sell Stock": { params: ["prices"], example: "prices = [7,1,5,3,6,4] -> 5" },
  "Longest Substring Without Repeating": { params: ["s"], example: "s = \"abcabcbb\" -> 3" },
  "Valid Parentheses": { params: ["s"], example: "s = \"()[]{}\" -> true" },
  "Find Minimum in Rotated Sorted Array": { params: ["nums"], example: "nums = [3,4,5,1,2] -> 1" },
  "Reverse Linked List": { params: ["head"], example: "head = [1,2,3,4,5] -> [5,4,3,2,1]" },
  "Merge Two Sorted Lists": { params: ["list1", "list2"], example: "list1 = [1,2,4], list2 = [1,3,4] -> [1,1,2,3,4,4]" },
  "Linked List Cycle": { params: ["head"], example: "head = [3,2,0,-4], pos = 1 -> true" },
  "Invert Binary Tree": { params: ["root"], example: "root = [4,2,7,1,3,6,9] -> [4,7,2,9,6,3,1]" },
  "Maximum Depth of Binary Tree": { params: ["root"], example: "root = [3,9,20,null,null,15,7] -> 3" },
  "Climbing Stairs": { params: ["n"], example: "n = 2 -> 2" },
  "House Robber": { params: ["nums"], example: "nums = [1,2,3,1] -> 4" },
};

const getStarterCode = (problem: string, lang: string) => {
  const info = PROBLEM_INFO[problem] || { params: ["nums"] };
  const safeName = problem.replace(/[^a-zA-Z0-9]/g, '');
  const camelCase = safeName.charAt(0).toLowerCase() + safeName.slice(1);
  const snake_case = safeName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  
  const jsParams = info.params.join(', ');
  const pyParams = info.params.join(', ');
  const javaParams = info.params.map(p => `Object ${p}`).join(', ');
  const cppParams = info.params.map(p => `auto ${p}`).join(', ');

  const exampleComment = info.example ? `\n * Example: ${info.example}` : '';
  const pyExampleComment = info.example ? `\n        # Example: ${info.example}` : '';

  switch (lang) {
    case 'python':
      return `class Solution:\n    def ${snake_case}(self, ${pyParams}):${pyExampleComment}\n        # Write your code here\n        pass`;
    case 'javascript':
      return `/**\n * Problem: ${problem}${exampleComment}\n */\nvar ${camelCase} = function(${jsParams}) {\n    // Write your code here\n};`;
    case 'java':
      return `class Solution {\n    public Object ${camelCase}(${javaParams}) {\n        // Write your code here\n        return null;\n    }\n}`;
    case 'cpp':
      return `class Solution {\npublic:\n    auto ${camelCase}(${cppParams}) {\n        // Write your code here\n    }\n};`;
    default:
      return '// Write your code here';
  }
};

const SketchCanvas = ({ data }: { data: DiagramData }) => {
  const getSketchyPath = (x1: number, y1: number, x2: number, y2: number) => {
    const seed = Math.floor(x1 + y1 + x2 + y2);
    const offsetX = (seed % 20) - 10;
    const offsetY = ((seed * 7) % 20) - 10;
    const midX = (x1 + x2) / 2 + offsetX;
    const midY = (y1 + y2) / 2 + offsetY;
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

export default function DSATeacher() {
  const [selectedProblem, setSelectedProblem] = useState('Two Sum');
  const [language, setLanguage] = useState('javascript');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  
  const currentCode = codeMap[`${selectedProblem}-${language}`] ?? getStarterCode(selectedProblem, language);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Konnichiwa! I am your DSA Sensei. 🖋️\n\nI am watching your code. Select a problem from the left, write your solution in the center, and ask me for hints or a code review here!",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState<'neutral' | 'happy' | 'thinking' | 'serious'>('neutral');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMoodEmoji = () => {
    switch (mood) {
      case 'happy': return '✨';
      case 'thinking': return '🤔';
      case 'serious': return '⚔️';
      default: return '🖋️';
    }
  };

  const getAsciiFace = () => {
    switch (mood) {
      case 'happy': return '( ˘ ▽ ˘ )';
      case 'thinking': return '( ಠ ʖ̯ ಠ )';
      case 'serious': return '( ಠ_ಠ )';
      default: return '(⌐■_■)';
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCodeMap(prev => ({ ...prev, [`${selectedProblem}-${language}`]: newCode }));
  };

  const handleProblemSelect = (prob: string) => {
    setSelectedProblem(prob);
    // Optionally add a message from Sensei when switching problems
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `Ah, **${prob}**! A fine choice. I am watching your code. Let me know when you need a hint.` }
    ]);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
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
          Your style is compact, to the point, and highly visual.
          Use Markdown for formatting. 
          
          TEACHING PHILOSOPHY (LeetCode Teacher):
          - Guide the student with Socratic questioning.
          - Provide hints first, then logic, then code only if necessary.
          - Focus on time and space complexity.
          - Be concise. No fluff.
          
          VISUAL PRESENTATION (RevealJS/Canvas Design):
          - Use structured sections.
          - Think of your explanations as slides or canvas layers.
          - Use diagrams to visualize data structures.
          
          CRITICAL CONTEXT:
          The student is currently working on the problem: "${selectedProblem}".
          Their current code in ${language} is:
          \`\`\`${language}
          ${currentCode}
          \`\`\`
          Always consider their current code when answering. If they ask for a review or hint, look at their code and guide them without giving away the full answer immediately. Point out specific lines or logic flaws if you see them.

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
          Use emojis like 🖋️, 📜, 💡, 🧠.`,
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
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errorMessage = error?.message || "An unknown error occurred.";
      setMessages(prev => [...prev, { role: 'assistant', content: `Gomen! Something went wrong in my meditation.\n\n**Error details:**\n\`\`\`\n${errorMessage}\n\`\`\`\n\nLet's try again.` }]);
      setMood('neutral');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "The slate is clean. A new journey begins! I am watching your code.",
    }]);
  };

  return (
    <div className="h-screen w-full bg-[#fdfcf0] overflow-hidden font-sans text-black relative">
      <PanelGroup orientation="horizontal" className="h-full w-full">
        
        {/* LEFT SIDEBAR: Problem List */}
        <Panel defaultSize={20} minSize={15} className="bg-white flex flex-col z-10 hidden md:flex">
          <div className="p-4 border-b-4 border-black bg-yellow-50 flex items-center gap-2">
            <BookOpen size={24} />
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Scrolls</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {DSA_PATTERNS.map((pattern, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[10px] font-black uppercase bg-zinc-100 p-1 border-2 border-black">{pattern.category}</div>
                {pattern.problems.map((prob, j) => (
                  <div 
                    key={j} 
                    onClick={() => handleProblemSelect(prob)}
                    className={cn(
                      "p-2 border-2 border-black manga-panel cursor-pointer flex items-center gap-2 ml-2 text-xs transition-colors",
                      selectedProblem === prob ? "bg-yellow-200" : "hover:bg-zinc-50 bg-white"
                    )}
                  >
                    <span className="font-bold truncate">{prob}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>

        <PanelResizeHandle className="w-3 bg-zinc-200 hover:bg-yellow-400 transition-colors cursor-col-resize border-x-4 border-black z-20 flex items-center justify-center">
          <GripVertical size={16} className="text-zinc-500" />
        </PanelResizeHandle>

        {/* CENTER: Code Editor */}
        <Panel defaultSize={50} minSize={30} className="flex flex-col min-w-0 bg-zinc-50 relative">
          <header className="h-14 border-b-4 border-black bg-white flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <Code2 size={20} />
              <div className="font-black italic text-lg truncate">{selectedProblem}</div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                className="border-2 border-black rounded px-2 py-1 text-xs font-bold uppercase bg-zinc-100 outline-none cursor-pointer hover:bg-zinc-200"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </header>
          <div className="flex-1 relative flex overflow-hidden bg-white">
            <Editor
              height="100%"
              language={language}
              value={currentCode}
              onChange={(value) => handleCodeChange(value || '')}
              theme="light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                lineHeight: 24,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "solid",
                cursorStyle: "underline",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                fastScrollSensitivity: 5,
                mouseWheelZoom: true,
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'hidden'
                }
              }}
              className="font-mono"
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-3 bg-zinc-200 hover:bg-yellow-400 transition-colors cursor-col-resize border-x-4 border-black z-20 flex items-center justify-center">
          <GripVertical size={16} className="text-zinc-500" />
        </PanelResizeHandle>

        {/* RIGHT SIDEBAR: Sensei Chat */}
        <Panel defaultSize={30} minSize={20} className="bg-white flex flex-col z-10">
          <div className="p-4 border-b-4 border-black bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                Sensei <span className="text-sm font-mono font-normal tracking-normal">{getAsciiFace()}</span>
              </h2>
            </div>
            <button onClick={clearChat} className="p-1 hover:bg-blue-100 rounded-full transition-colors border-2 border-transparent hover:border-black" title="Clear Chat">
              <Trash2 size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 border-black shrink-0 manga-panel relative",
                    msg.role === 'user' ? "bg-blue-200" : "bg-yellow-200"
                  )}>
                    {msg.role === 'user' ? <User size={20} /> : <span className="font-mono text-xs font-bold">{getAsciiFace().slice(1, -1)}</span>}
                    {msg.role === 'assistant' && idx === messages.length - 1 && (
                      <div className="absolute -top-1 -right-1 bg-white border-2 border-black rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                        {getMoodEmoji()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "p-4 manga-panel border-2 border-black relative text-sm",
                      msg.role === 'user' ? "bg-blue-50" : "bg-white"
                    )}>
                      <div className="prose prose-sm max-w-none 
                        prose-headings:font-black prose-headings:italic prose-headings:uppercase
                        prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:border-2 prose-pre:border-black prose-pre:p-2
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
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-zinc-200 border-2 border-black animate-bounce flex items-center justify-center font-mono text-xs font-bold">
                  {getAsciiFace().slice(1, -1)}
                </div>
                <div className="p-3 bg-white border-2 border-black rounded-lg italic font-mono text-xs">
                  Sensei is analyzing...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t-4 border-black bg-zinc-50">
            <div className="relative flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Sensei..."
                className="flex-1 p-3 border-2 border-black rounded-lg bg-white focus:outline-none text-sm font-medium placeholder:italic manga-panel min-h-[60px] max-h-[150px] resize-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="p-3 bg-black text-white rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 manga-panel shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
            <button 
              onClick={() => {
                setInput("Sensei, please review my code and give me a hint.");
                setTimeout(() => handleSend("Sensei, please review my code and give me a hint."), 50);
              }}
              disabled={isLoading}
              className="w-full mt-3 py-2 border-2 border-black rounded bg-yellow-100 hover:bg-yellow-200 font-black text-xs uppercase transition-colors flex items-center justify-center gap-2 manga-panel disabled:opacity-50"
            >
              <MessageSquare size={14} /> Review My Code
            </button>
          </div>
        </Panel>
      </PanelGroup>

      {/* Global Overlay for Manga Style */}
      <div className="fixed inset-0 pointer-events-none border-[12px] border-black z-50 mix-blend-multiply opacity-10" />
      <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 z-40" />
    </div>
  );
}
