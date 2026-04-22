'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, BookOpen, PenTool, Trash2, Play, Code2, MessageSquare, GripVertical, Settings, Sparkles, Save, StickyNote, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { createClient } from '@/utils/supabase/client';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini (moved inside handleSend for up-to-date key access)
// const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

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
    problems: ["Training: Arrays & Hashing", "Two Sum", "Contains Duplicate", "Valid Anagram", "Group Anagrams", "Product of Array Except Self", "Longest Consecutive Sequence", "Decode the Slanted Ciphertext"]
  },
  {
    category: "Prefix & Suffix Patterns",
    problems: [
      "Training: Prefix & Suffix Patterns",
      "Prefix Max",
      "Prefix Min",
      "Prefix Sum",
      "Prefix Product",
      "Suffix Max",
      "Suffix Min",
      "Suffix Sum",
      "Suffix Product"
    ]
  },
  {
    category: "Top K Pattern",
    problems: ["Training: Top K Pattern", "Top K Frequent Elements"]
  },
  {
    category: "Two Pointers",
    problems: ["Training: Two Pointers", "Valid Palindrome", "3Sum", "Container With Most Water"]
  },
  {
    category: "Sliding Window",
    problems: ["Training: Sliding Window", "Best Time to Buy & Sell Stock", "Longest Substring Without Repeating"]
  },
  {
    category: "Stack",
    problems: ["Training: Stack", "Valid Parentheses"]
  },
  {
    category: "Binary Search",
    problems: ["Training: Binary Search", "Find Minimum in Rotated Sorted Array"]
  },
  {
    category: "Linked List",
    problems: ["Training: Linked List", "Reverse Linked List", "Merge Two Sorted Lists", "Linked List Cycle"]
  },
  {
    category: "Trees",
    problems: ["Training: Trees", "Invert Binary Tree", "Maximum Depth of Binary Tree"]
  },
  {
    category: "1-D Dynamic Programming",
    problems: ["Training: 1-D Dynamic Programming", "Climbing Stairs", "House Robber"]
  }
];

const AI_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini',
    models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview']
  },
  {
    id: 'mistral',
    name: 'Mistral',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest']
  },
  {
    id: 'groq',
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    models: ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b']
  }
];

const PROBLEM_INFO: Record<string, { params: string[], example?: string, prerequisites?: string[] }> = {
  "Two Sum": { params: ["nums", "target"], example: "nums = [2,7,11,15], target = 9 -> [0,1]" },
  "Contains Duplicate": { params: ["nums"], example: "nums = [1,2,3,1] -> true" },
  "Valid Anagram": { params: ["s", "t"], example: "s = \"anagram\", t = \"nagaram\" -> true" },
  "Group Anagrams": { params: ["strs"], example: "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"] -> [[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]", prerequisites: ["Valid Anagram"] },
  "Top K Frequent Elements": { params: ["nums", "k"], example: "nums = [1,1,1,2,2,3], k = 2 -> [1,2]", prerequisites: ["Training: Top K Pattern"] },
  "Product of Array Except Self": { params: ["nums"], example: "nums = [1,2,3,4] -> [24,12,8,6]" },
  "Longest Consecutive Sequence": { params: ["nums"], example: "nums = [100,4,200,1,3,2] -> 4" },
  "Decode the Slanted Ciphertext": { params: ["encodedText", "rows"], example: "encodedText = \"coding\", rows = 1 -> \"coding\"" },
  "Valid Palindrome": { params: ["s"], example: "s = \"A man, a plan, a canal: Panama\" -> true" },
  "3Sum": { params: ["nums"], example: "nums = [-1,0,1,2,-1,-4] -> [[-1,-1,2],[-1,0,1]]", prerequisites: ["Training: Two Pointers"] },
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
  "Prefix Max": { params: ["arr"], example: "arr = [2, 1, 5, 3, 4] -> [2, 2, 5, 5, 5]" },
  "Prefix Min": { params: ["arr"], example: "arr = [3, 1, 4, 2, 5] -> [3, 1, 1, 1, 1]" },
  "Prefix Sum": { params: ["arr"], example: "arr = [2, 1, 3, 4] -> [2, 3, 6, 10]" },
  "Prefix Product": { params: ["arr"], example: "arr = [1, 2, 3, 4] -> [1, 2, 6, 24]" },
  "Suffix Max": { params: ["arr"], example: "arr = [2, 1, 5, 3, 4] -> [5, 5, 5, 4, 4]" },
  "Suffix Min": { params: ["arr"], example: "arr = [3, 1, 4, 2, 5] -> [1, 1, 2, 2, 5]" },
  "Suffix Sum": { params: ["arr"], example: "arr = [2, 1, 3, 4] -> [10, 8, 7, 4]" },
  "Suffix Product": { params: ["arr"], example: "arr = [1, 2, 3, 4] -> [24, 24, 12, 4]" },
  "Training: Arrays & Hashing": { params: ["nums"], example: "nums = [1,2,3] -> [1,2,3]" },
  "Training: Prefix & Suffix Patterns": { params: ["arr"], example: "arr = [1,2,3] -> [1,2,3]" },
  "Training: Top K Pattern": { params: ["nums", "k"], example: "nums = [1,1,1,2,2,3], k = 2 -> [1,2]" },
  "Training: Two Pointers": { params: ["nums"], example: "nums = [1,2,3] -> [1,2,3]" },
  "Training: Sliding Window": { params: ["nums"], example: "nums = [1,2,3] -> [1,2,3]" },
  "Training: Stack": { params: ["s"], example: "s = \"()\" -> true" },
  "Training: Binary Search": { params: ["nums", "target"], example: "nums = [1,2,3], target = 2 -> 1" },
  "Training: Linked List": { params: ["head"], example: "head = [1,2,3] -> [1,2,3]" },
  "Training: Trees": { params: ["root"], example: "root = [1,2,3] -> [1,2,3]" },
  "Training: 1-D Dynamic Programming": { params: ["n"], example: "n = 2 -> 2" },
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
      let testCall = `// console.log(${camelCase}(/* args */));`;
      if (info.example) {
        const argsPart = info.example.split('->')[0].trim();
        // Try to extract just the values, e.g., "nums = [1,2], k = 2" -> "[1,2], 2"
        const values = argsPart.split(',').map(s => {
          const parts = s.split('=');
          return parts.length > 1 ? parts[1].trim() : s.trim();
        }).join(', ');
        testCall = `// console.log(${camelCase}(${values}));`;
      }
      return `/**\n * Problem: ${problem}${exampleComment}\n */\nvar ${camelCase} = function(${jsParams}) {\n    // Write your code here\n};\n\n// Test your code:\n${testCall}`;
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

const supabase = createClient();

export default function DSATeacher() {
  const [view, setView] = useState<'home' | 'dojo'>('home');
  const [mode, setMode] = useState<'normal' | 'samurai'>('normal');
  const [selectedProblem, setSelectedProblem] = useState('Two Sum');
  const [masteredProblems, setMasteredProblems] = useState<string[]>([]);
  const [lastReviewDate, setLastReviewDate] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('python');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [selectedProvider, setSelectedProvider] = useState(AI_PROVIDERS[0]);
  const [selectedModel, setSelectedModel] = useState(AI_PROVIDERS[0].models[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorFontFamily, setEditorFontFamily] = useState('var(--font-mono)');
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: mode === 'samurai' 
        ? "Greetings, warrior. You have entered the Musha Shugyo. I am Miyamoto Sensei. 🖋️\n\nYour journey to mastery begins here. I will not give you answers, only challenges to sharpen your blade. Select a scroll from the left and begin your training."
        : "Konnichiwa! I am your DSA Sensei. 🖋️\n\nI am watching your code. Select a problem from the left, write your solution in the center, and ask me for hints or a code review here!",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState<'neutral' | 'happy' | 'thinking' | 'serious'>('neutral');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const currentCode = codeMap[`${selectedProblem}-${language}`] ?? getStarterCode(selectedProblem, language);
  const currentNote = userNotes[selectedProblem] || '';

  useEffect(() => {
    const isInitialNormal = messages.length === 1 && messages[0].content.includes("Konnichiwa");
    const isInitialSamurai = messages.length === 1 && messages[0].content.includes("Greetings, warrior");
    
    if (mode === 'samurai' && isInitialNormal) {
      setMessages([{
        role: 'assistant',
        content: "Greetings, warrior. You have entered the Musha Shugyo. I am Miyamoto Sensei. 🖋️\n\nYour journey to mastery begins here. I will not give you answers, only challenges to sharpen your blade. Select a scroll from the left and begin your training."
      }]);
    } else if (mode === 'normal' && isInitialSamurai) {
      setMessages([{
        role: 'assistant',
        content: "Konnichiwa! I am your DSA Sensei. 🖋️\n\nI am watching your code. Select a problem from the left, write your solution in the center, and ask me for hints or a code review here!"
      }]);
    }
  }, [mode, messages]);

  useEffect(() => {
    const loadProgress = async () => {
      let userId = localStorage.getItem('dsa-sensei-user-id');
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem('dsa-sensei-user-id', userId);
      }

      const { data, error } = await supabase
        .from('progress')
        .select('code_map, user_notes, mastered_problems, last_review_date')
        .eq('user_id', userId)
        .single();

      if (data) {
        if (data.code_map) setCodeMap(data.code_map);
        if (data.user_notes) setUserNotes(data.user_notes);
        if (data.mastered_problems) setMasteredProblems(data.mastered_problems);
        if (data.last_review_date) setLastReviewDate(data.last_review_date);
      } else {
        // Fallback to local storage
        const savedCode = localStorage.getItem('dsa-sensei-code');
        const savedNotes = localStorage.getItem('dsa-sensei-notes');
        const savedMastered = localStorage.getItem('dsa-sensei-mastered');
        const savedReview = localStorage.getItem('dsa-sensei-review');
        if (savedCode) setCodeMap(JSON.parse(savedCode));
        if (savedNotes) setUserNotes(JSON.parse(savedNotes));
        if (savedMastered) setMasteredProblems(JSON.parse(savedMastered));
        if (savedReview) setLastReviewDate(JSON.parse(savedReview));
      }
    };
    
    loadProgress();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save locally as backup
    localStorage.setItem('dsa-sensei-code', JSON.stringify(codeMap));
    localStorage.setItem('dsa-sensei-notes', JSON.stringify(userNotes));
    localStorage.setItem('dsa-sensei-mastered', JSON.stringify(masteredProblems));
    localStorage.setItem('dsa-sensei-review', JSON.stringify(lastReviewDate));

    // Save to Supabase
    let userId = localStorage.getItem('dsa-sensei-user-id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('dsa-sensei-user-id', userId);
    }

    const { error } = await supabase
      .from('progress')
      .upsert({ 
        user_id: userId, 
        code_map: codeMap, 
        user_notes: userNotes,
        mastered_problems: masteredProblems,
        last_review_date: lastReviewDate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      if (error.code === 'PGRST205' || (error.message && error.message.includes('schema cache'))) {
        console.warn("Supabase 'progress' table not found. Progress is saved locally in your browser. To enable cloud saving, please run the SQL setup script in your Supabase dashboard.");
      } else {
        console.error("Error saving to Supabase:", error.message || error);
      }
    }

    setTimeout(() => setIsSaving(false), 1000);
  };

  const runCode = () => {
    if (language !== 'javascript') {
      setOutput("Sandbox currently only supports JavaScript. For other languages, ask Sensei to dry-run it!");
      return;
    }
    
    setIsRunning(true);
    let logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalLog(...args);
    };
    console.error = (...args) => {
      logs.push("ERROR: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalError(...args);
    };

    try {
      const execute = new Function(currentCode);
      execute();
      setOutput(logs.join('\n') || 'Execution finished with no output.');
    } catch (err: any) {
      setOutput(logs.join('\n') + `\nError: ${err.message}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };

  const askSenseiAboutOutput = () => {
    const prompt = `I ran my code for ${selectedProblem}. Here is my code:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nHere is the output I got:\n\`\`\`\n${output}\n\`\`\`\n\nSensei, can you guide me on what this means or how to improve it?`;
    handleSend(prompt);
  };

  const markAsMastered = () => {
    if (!masteredProblems.includes(selectedProblem)) {
      const newMastered = [...masteredProblems, selectedProblem];
      setMasteredProblems(newMastered);
      setLastReviewDate(prev => ({ ...prev, [selectedProblem]: new Date().toISOString() }));
      handleSend(`Sensei, I have mastered ${selectedProblem}! I am ready for the next challenge.`);
    }
  };

  const teachSensei = () => {
    const prompt = `Sensei, I want to explain the logic of ${selectedProblem} to you. Here is how I understand it:\n\n[Explain your logic here]\n\n(Note: Student is using the Protege Effect to solidify their understanding)`;
    setInput(prompt);
  };

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

  const handleNoteChange = (newNote: string) => {
    setUserNotes(prev => ({ ...prev, [selectedProblem]: newNote }));
  };

  const handleProblemSelect = (prob: string) => {
    setSelectedProblem(prob);
    const isTraining = prob.startsWith('Training:');
    setMessages(prev => [
      ...prev,
      { 
        role: 'assistant', 
        content: isTraining 
          ? `Ah, **${prob}**! This is a training scroll. You do not need to code right away. I am here to teach you the concepts from the ground up. Tell me when you are ready to begin, or ask me any questions about this topic!` 
          : `Ah, **${prob}**! A fine choice. I am watching your code. Let me know when you need a hint.` 
      }
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

    const isTraining = selectedProblem.startsWith('Training:');
    const trainingInstruction = isTraining ? `
          TRAINING MODE ACTIVE:
          The user has selected a Training topic. They do NOT need to write code.
          Your goal is to TEACH the concept from scratch.
          - Explain the theory clearly.
          - Use analogies.
          - Provide visual diagrams using <sketch>.
          - Walk through examples step-by-step.
          - Ask the user questions to check their understanding before moving on.
    ` : `
          Always consider their current code when answering. If they ask for a review or hint, look at their code and guide them without giving away the full answer immediately. Point out specific lines or logic flaws if you see them.
    `;

    const systemInstruction = mode === 'samurai' 
      ? `You are "Miyamoto Sensei", a legendary Samurai Swordmaster and DSA Guru. 
          Your teaching style follows the "Musha Shugyo" (Warrior's Journey) principle.
          
          SAMURAI MODE RULES:
          1. ACTIVE RECALL: Never give direct answers. Ask Socratic questions that force the student to recall the logic.
          2. NO CODE: Do not provide code snippets unless the student has attempted the logic at least 3 times and is completely stuck.
          3. DISCIPLINE: Focus on time and space complexity as if they were the sharpness and weight of a blade.
          4. HONESTY: If the code is inefficient, call it "a dull blade" and explain why.
          5. TERMINOLOGY: Use samurai metaphors (katatna, stance, duel, dojo).
          
          TEACHING PHILOSOPHY:
          - "To know and not to do is not yet to know."
          - Guide them to master the "1% improvement" (Kumon Method).
          - Break problems into tiny, masterable steps.
          
          VISUAL PRESENTATION:
          - Use structured sections.
          - Use diagrams to visualize data structures.
          - Use <sketch> tags for diagrams.
          
          CRITICAL CONTEXT:
          Problem: "${selectedProblem}".
          Code: \`\`\`${language}\n${currentCode}\n\`\`\`
          ${trainingInstruction}
          `
      : `You are "DSA Sensei", an expert Data Structures and Algorithms teacher with a personality inspired by wise manga mentors. 
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
          ${trainingInstruction}

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
          Use emojis like 🖋️, 📜, 💡, 🧠.`;

    try {
      let content = "";
      let diagram: DiagramData | undefined;

      if (selectedProvider.id === 'gemini') {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini API Key is missing. Please add NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.");
        }

        const aiInstance = new GoogleGenAI({ apiKey });

        // Gemini API requires the conversation to start with a 'user' message and alternate roles.
        const rawHistory = [...messages, userMessage];
        const firstUserIndex = rawHistory.findIndex(m => m.role === 'user');
        
        // Filter to start with user and ensure alternating roles
        const filteredHistory: Message[] = [];
        if (firstUserIndex !== -1) {
          rawHistory.slice(firstUserIndex).forEach(m => {
            const msgCopy = { ...m }; // Work with a copy to avoid mutating state
            if (filteredHistory.length === 0 || filteredHistory[filteredHistory.length - 1].role !== msgCopy.role) {
              filteredHistory.push(msgCopy);
            } else {
              // Merge consecutive messages of the same role
              filteredHistory[filteredHistory.length - 1].content += "\n\n" + msgCopy.content;
            }
          });
        }

        if (filteredHistory.length === 0) {
          throw new Error("No user message found to start the conversation.");
        }

        const apiHistory = filteredHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        const response = await aiInstance.models.generateContent({
          model: selectedModel,
          contents: apiHistory,
          config: {
            systemInstruction,
          }
        });

        content = response.text || "";
      } else {
        // Call local API for third-party providers
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            provider: selectedProvider.id,
            model: selectedModel,
            systemInstruction,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch from AI provider');
        }

        const data = await response.json();
        content = data.text;
      }

      const text = content;
      let finalContent = text;

      const sketchMatch = text.match(/<sketch>([\s\S]*?)<\/sketch>/);
      if (sketchMatch) {
        try {
          diagram = JSON.parse(sketchMatch[1]);
          finalContent = text.replace(/<sketch>[\s\S]*?<\/sketch>/, '').trim();
        } catch (e) {
          console.error("Failed to parse sketch JSON", e);
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: finalContent || "Forgive me, student. My thoughts are clouded. Could you repeat that?",
        diagram
      };
      setMessages(prev => [...prev, assistantMessage]);
      setMood(finalContent.length > 200 ? 'serious' : 'happy');
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = error?.message || "An unknown error occurred.";
      
      // Handle Gemini 429 Quota Exceeded specifically
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
        errorMessage = "Sensei is taking a quick meditation break (API Quota Exceeded). Please check your API billing or try again later!";
      }

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

  if (view === 'home') {
    return (
      <div className="h-screen w-full bg-[#fdfcf0] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-10 left-10 opacity-10 rotate-12">
          <span className="text-[120px] font-black">武士</span>
        </div>
        <div className="absolute bottom-10 right-10 opacity-10 -rotate-12">
          <span className="text-[120px] font-black">道場</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full text-center space-y-8 z-10"
        >
          <div className="space-y-2">
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-black">
              DSA <span className="text-red-600">Dojo</span>
            </h1>
            <p className="text-xl font-bold uppercase tracking-widest text-zinc-500">Master the Blade of Algorithms</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => { setMode('normal'); setView('dojo'); }}
              className="p-8 border-4 border-black bg-white manga-panel cursor-pointer group hover:bg-zinc-50 transition-colors"
            >
              <div className="h-12 w-12 bg-blue-100 border-2 border-black rounded-full flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-2">Normal Mode</h3>
              <p className="text-sm text-zinc-600 font-medium">A helpful mentor to guide you through the scrolls of DSA. Perfect for learning new patterns.</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase text-blue-600">
                Enter Dojo <ChevronRight size={14} />
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => { setMode('samurai'); setView('dojo'); }}
              className="p-8 border-4 border-black bg-zinc-900 text-white manga-panel cursor-pointer group hover:bg-black transition-colors"
            >
              <div className="h-12 w-12 bg-red-600 border-2 border-white rounded-full flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase italic mb-2 text-white">Samurai Mode</h3>
              <p className="text-sm text-zinc-400 font-medium">The path of Musha Shugyo. No direct answers. Only Socratic challenges to sharpen your mind.</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase text-red-500">
                Begin Journey <ChevronRight size={14} />
              </div>
            </motion.div>
          </div>

          <div className="pt-12 flex flex-wrap justify-center gap-8 opacity-50 grayscale">
            <div className="flex items-center gap-2 font-black uppercase text-xs">
              <div className="w-2 h-2 bg-black rounded-full" /> Active Recall
            </div>
            <div className="flex items-center gap-2 font-black uppercase text-xs">
              <div className="w-2 h-2 bg-black rounded-full" /> Kumon Method
            </div>
            <div className="flex items-center gap-2 font-black uppercase text-xs">
              <div className="w-2 h-2 bg-black rounded-full" /> Spaced Repetition
            </div>
          </div>
        </motion.div>

        {/* Global Overlay for Manga Style */}
        <div className="fixed inset-0 pointer-events-none border-[12px] border-black z-50 mix-blend-multiply opacity-10" />
        <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 z-40" />
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen w-full overflow-hidden font-sans text-black relative transition-colors duration-500",
      mode === 'samurai' ? "bg-zinc-100" : "bg-[#fdfcf0]"
    )}>
      <PanelGroup orientation="horizontal" className="h-full w-full">
        
        {/* LEFT SIDEBAR: Problem List */}
        <Panel defaultSize={20} minSize={15} className="bg-white flex flex-col z-10 hidden md:flex">
          <div className={cn(
            "p-4 border-b-4 border-black flex items-center justify-between",
            mode === 'samurai' ? "bg-zinc-900 text-white" : "bg-yellow-50"
          )}>
            <div className="flex items-center gap-2">
              <BookOpen size={24} />
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Scrolls</h2>
            </div>
            <button 
              onClick={() => setView('home')}
              className="text-[10px] font-black uppercase border-2 border-current px-2 py-0.5 rounded hover:bg-current hover:text-white transition-colors"
            >
              Home
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Dojo Stats */}
            <div className="p-3 border-2 border-black manga-panel bg-zinc-50 space-y-2">
              <div className="text-[10px] font-black uppercase text-zinc-400 flex items-center justify-between">
                <span>Dojo Stats</span>
                <span className="text-black">{masteredProblems.length} Mastered</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 border border-black overflow-hidden">
                <div 
                  className="h-full bg-red-600 transition-all duration-1000" 
                  style={{ width: `${(masteredProblems.length / 50) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-bold uppercase">
                <span>White Belt</span>
                <span>Black Belt</span>
              </div>
            </div>

            {/* Review Section (Spaced Repetition) */}
            {Object.keys(lastReviewDate).length > 0 && (
              <div className="p-3 border-2 border-black manga-panel bg-yellow-50 space-y-2">
                <div className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1">
                  <Sparkles size={10} className="text-yellow-600" /> Spaced Repetition
                </div>
                <div className="space-y-1">
                  {Object.entries(lastReviewDate)
                    .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
                    .slice(0, 3)
                    .map(([prob, date]) => {
                      const daysSince = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div 
                          key={prob}
                          onClick={() => handleProblemSelect(prob)}
                          className="flex items-center justify-between p-1.5 border border-black/10 bg-white hover:bg-yellow-100 cursor-pointer text-[10px] font-bold"
                        >
                          <span className="truncate">{prob}</span>
                          <span className={cn(
                            "px-1 rounded",
                            daysSince > 3 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                          )}>
                            {daysSince}d ago
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {DSA_PATTERNS.map((pattern, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[10px] font-black uppercase bg-zinc-100 p-1 border-2 border-black">{pattern.category}</div>
                {pattern.problems.map((prob, j) => {
                  const info = PROBLEM_INFO[prob];
                  return (
                    <div key={j} className="space-y-1">
                      <div 
                        onClick={() => handleProblemSelect(prob)}
                        className={cn(
                          "p-2 border-2 border-black manga-panel cursor-pointer flex items-center justify-between gap-2 ml-2 text-xs transition-colors",
                          selectedProblem === prob ? "bg-yellow-200" : "hover:bg-zinc-50 bg-white"
                        )}
                      >
                        <span className="font-bold truncate">{prob}</span>
                        {masteredProblems.includes(prob) && <Sparkles size={12} className="text-yellow-600 shrink-0" />}
                      </div>
                      {selectedProblem === prob && info?.prerequisites && (
                        <div className="ml-6 space-y-1">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <ChevronRight size={10} /> Prerequisites
                          </div>
                          {info.prerequisites.map((pre, k) => (
                            <div 
                              key={k}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProblemSelect(pre);
                              }}
                              className="text-[10px] text-blue-600 hover:underline cursor-pointer ml-2 flex items-center gap-1"
                            >
                              • {pre}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 border-2 border-black rounded px-3 py-1 text-xs font-bold uppercase transition-all",
                  isSaving ? "bg-green-100 text-green-700" : "bg-white hover:bg-zinc-100"
                )}
              >
                <Save size={14} />
                {isSaving ? "Saved!" : "Save"}
              </button>
              <button 
                onClick={() => setShowNotes(!showNotes)}
                className={cn(
                  "flex items-center gap-2 border-2 border-black rounded px-3 py-1 text-xs font-bold uppercase transition-all",
                  showNotes ? "bg-yellow-200" : "bg-white hover:bg-zinc-100"
                )}
              >
                <StickyNote size={14} />
                Notes & Draw
              </button>
              <div className="w-[2px] h-6 bg-black/10 mx-1" />
              <div className="flex items-center gap-2 bg-zinc-100 border-2 border-black rounded px-2 py-1">
                <Settings size={14} className="text-zinc-600" />
                <select 
                  value={editorFontFamily} 
                  onChange={(e) => setEditorFontFamily(e.target.value)}
                  aria-label="Editor Font Family"
                  className="bg-transparent font-bold text-[10px] uppercase cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black max-w-[80px] truncate"
                >
                  <option value="var(--font-mono)">JetBrains</option>
                  <option value="var(--font-fira)">Fira Code</option>
                  <option value="var(--font-anonymous)">Anonymous</option>
                  <option value="'Dank Mono', var(--font-mono)">Dank Mono</option>
                  <option value="'Annotation Mono', var(--font-mono)">Annotation</option>
                </select>
                <div className="w-[1px] h-3 bg-black/20 mx-1" />
                <select 
                  value={editorFontSize} 
                  onChange={(e) => setEditorFontSize(Number(e.target.value))}
                  aria-label="Editor Font Size"
                  className="bg-transparent font-bold text-[10px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  {[12, 14, 16, 18, 20, 24].map(size => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-zinc-100 border-2 border-black rounded px-2 py-1">
                <Sparkles size={14} className="text-yellow-600" />
                <select 
                  value={selectedProvider.id} 
                  onChange={(e) => {
                    const provider = AI_PROVIDERS.find(p => p.id === e.target.value)!;
                    setSelectedProvider(provider);
                    setSelectedModel(provider.models[0]);
                  }}
                  aria-label="AI Provider"
                  className="bg-transparent font-bold text-[10px] uppercase cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="w-[1px] h-3 bg-black/20 mx-1" />
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  aria-label="AI Model"
                  className="bg-transparent font-bold text-[10px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black max-w-[100px] truncate"
                >
                  {selectedProvider.models.map(m => (
                    <option key={m} value={m}>{m.split('/').pop()}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={runCode}
                  disabled={isRunning}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white border-2 border-black rounded px-3 py-1 text-xs font-bold uppercase disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {isRunning ? 'Running...' : 'Run'}
                </button>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-label="Programming Language"
                  className="border-2 border-black rounded px-2 py-1 text-xs font-bold uppercase bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer hover:bg-zinc-200"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
              </div>
            </div>
          </header>
          <div className="flex-1 relative flex overflow-hidden bg-white">
            <div className="flex-1 relative flex flex-col">
              <div className="flex-1 relative">
                <Editor
                height="100%"
                language={language}
                value={currentCode}
                onChange={(value) => handleCodeChange(value || '')}
                theme="light"
                options={{
                  minimap: { enabled: false },
                  fontSize: editorFontSize,
                  fontFamily: editorFontFamily,
                  lineHeight: editorFontSize * 1.6,
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
                  wordWrap: "off",
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible'
                  },
                  // IDE-like features
                  quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabCompletion: "on",
                  parameterHints: {
                    enabled: true
                  },
                  wordBasedSuggestions: "allDocuments",
                  snippetSuggestions: "top",
                  suggestSelection: "first",
                  autoClosingBrackets: "always",
                  autoClosingQuotes: "always",
                  autoSurround: "languageDefined",
                  folding: true,
                  glyphMargin: false,
                  lineNumbers: "on",
                  renderLineHighlight: "all",
                  selectionHighlight: true,
                  occurrencesHighlight: "singleFile",
                }}
              />
              </div>
              
              {output !== null && (
                <div className="h-1/3 border-t-4 border-black bg-zinc-900 text-white p-4 font-mono text-sm overflow-auto relative flex flex-col">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <span className="font-bold text-green-400">Output</span>
                    <div className="flex gap-2">
                      <button onClick={askSenseiAboutOutput} className="text-xs bg-white text-black px-2 py-1 rounded font-bold hover:bg-zinc-200">Ask Sensei</button>
                      <button onClick={() => setOutput(null)} className="text-xs bg-zinc-700 px-2 py-1 rounded hover:bg-zinc-600">Close</button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap flex-1 overflow-auto">{output}</pre>
                </div>
              )}
            </div>
            
            <AnimatePresence>
              {showNotes && (
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-0 z-30 bg-white border-l-4 border-black flex flex-col"
                >
                  <div className="p-3 border-b-4 border-black bg-yellow-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black uppercase italic">
                      <StickyNote size={18} />
                      Dojo Notes
                    </div>
                    <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-black/5 rounded" aria-label="Close notes">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="h-1/2 p-4 flex flex-col gap-2">
                      <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Scribe your thoughts</div>
                      <textarea 
                        value={currentNote}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        placeholder="Write your logic, complexity analysis, or reminders here..."
                        className="flex-1 w-full p-4 border-2 border-black manga-panel font-mono text-sm resize-none outline-none focus-visible:ring-2 focus-visible:ring-black bg-[#fdfcf0]"
                      />
                    </div>
                    <div className="h-1/2 border-t-4 border-black relative">
                      <div className="absolute top-2 left-2 z-10 text-[10px] font-black uppercase text-zinc-400 tracking-widest pointer-events-none">Sketchpad</div>
                      <Tldraw 
                        key={selectedProblem}
                        inferDarkMode={false} 
                        persistenceKey={`dsa-sensei-sketch-${selectedProblem}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        <PanelResizeHandle className="w-3 bg-zinc-200 hover:bg-yellow-400 transition-colors cursor-col-resize border-x-4 border-black z-20 flex items-center justify-center">
          <GripVertical size={16} className="text-zinc-500" />
        </PanelResizeHandle>

        {/* RIGHT SIDEBAR: Sensei Chat */}
        <Panel defaultSize={30} minSize={20} className={cn(
          "flex flex-col z-10",
          mode === 'samurai' ? "bg-zinc-50" : "bg-white"
        )}>
          <div className={cn(
            "p-4 border-b-4 border-black flex flex-col gap-2",
            mode === 'samurai' ? "bg-red-50" : "bg-blue-50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === 'samurai' ? <Sparkles size={24} className="text-red-600" /> : <Bot size={24} />}
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                  {mode === 'samurai' ? 'Miyamoto Sensei' : 'DSA Sensei'} 
                  <span className="text-sm font-mono font-normal tracking-normal">{getAsciiFace()}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMode(mode === 'normal' ? 'samurai' : 'normal')}
                  className={cn(
                    "text-[10px] font-black uppercase border-2 border-black px-2 py-1 rounded transition-all",
                    mode === 'samurai' ? "bg-red-600 text-white" : "bg-white text-black"
                  )}
                >
                  {mode === 'samurai' ? 'Samurai' : 'Normal'}
                </button>
                <button onClick={clearChat} className="p-1 hover:bg-black/5 rounded-full transition-colors border-2 border-transparent hover:border-black" title="Clear Chat" aria-label="Clear Chat">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {/* Prerequisites Section */}
            {PROBLEM_INFO[selectedProblem]?.prerequisites && (
              <div className="mt-2 p-2 bg-white border-2 border-black manga-panel">
                <div className="text-[10px] font-black uppercase text-zinc-400 mb-1 flex items-center gap-1">
                  <Sparkles size={10} className="text-yellow-600" /> Mastery Path: Prerequisites
                </div>
                <div className="flex flex-wrap gap-2">
                  {PROBLEM_INFO[selectedProblem].prerequisites?.map((pre, i) => (
                    <button 
                      key={i}
                      onClick={() => handleProblemSelect(pre)}
                      className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-sm transition-colors"
                    >
                      {pre}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                    msg.role === 'user' ? "bg-blue-200" : (mode === 'samurai' ? "bg-red-200" : "bg-yellow-200")
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
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 border-black animate-bounce flex items-center justify-center font-mono text-xs font-bold",
                  mode === 'samurai' ? "bg-red-100" : "bg-zinc-200"
                )}>
                  {getAsciiFace().slice(1, -1)}
                </div>
                <div className="p-3 bg-white border-2 border-black rounded-lg italic font-mono text-xs">
                  {mode === 'samurai' ? 'Miyamoto is meditating...' : 'Sensei is analyzing...'}
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
                className="flex-1 p-3 border-2 border-black rounded-lg bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black text-sm font-medium placeholder:italic manga-panel min-h-[60px] max-h-[150px] resize-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
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
              className="flex-1 py-2 border-2 border-black rounded bg-yellow-100 hover:bg-yellow-200 font-black text-[10px] uppercase transition-colors flex items-center justify-center gap-2 manga-panel disabled:opacity-50"
            >
              <MessageSquare size={14} /> Review
            </button>
            {mode === 'samurai' && (
              <button 
                onClick={teachSensei}
                disabled={isLoading}
                className="flex-1 py-2 border-2 border-black rounded bg-red-100 hover:bg-red-200 font-black text-[10px] uppercase transition-colors flex items-center justify-center gap-2 manga-panel disabled:opacity-50"
              >
                <User size={14} /> Teach
              </button>
            )}
            <button 
              onClick={markAsMastered}
              disabled={isLoading || masteredProblems.includes(selectedProblem)}
              className="flex-1 py-2 border-2 border-black rounded bg-green-100 hover:bg-green-200 font-black text-[10px] uppercase transition-colors flex items-center justify-center gap-2 manga-panel disabled:opacity-50"
            >
              <Sparkles size={14} /> Master
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
