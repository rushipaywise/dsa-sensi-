'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { ExplanationVideo } from './ExplanationVideo';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  problem: string;
  code: string;
  language: string;
  detailedExplanation?: string;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ isOpen, onClose, problem, code, language, detailedExplanation }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-5xl bg-white border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b-4 border-black bg-yellow-400 flex items-center justify-between">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              Sensei&apos;s Video Scroll: <span className="text-black/70">{problem}</span>
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-black/10 rounded-full transition-colors border-2 border-transparent hover:border-black"
            >
              <X size={24} />
            </button>
          </div>

          {/* Player Container */}
          <div className="flex-1 aspect-video bg-zinc-100 relative">
            <Player
              component={ExplanationVideo}
              durationInFrames={450} // 15 seconds at 30fps
              compositionWidth={1280}
              compositionHeight={720}
              fps={30}
              inputProps={{ problem, code, language, detailedExplanation }}
              style={{
                width: '100%',
                height: '100%',
              }}
              controls
              autoPlay
              loop
            />
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-zinc-50 border-t-4 border-black flex items-center justify-between">
            <div className="text-sm font-mono font-bold uppercase tracking-widest text-zinc-500">
              Remotion Powered • Sensei Vision
            </div>
            <div className="flex gap-4">
              <div className="px-3 py-1 bg-blue-100 border-2 border-black font-bold text-xs uppercase">
                {language}
              </div>
              <div className="px-3 py-1 bg-yellow-100 border-2 border-black font-bold text-xs uppercase">
                AI Generated Wisdom
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
