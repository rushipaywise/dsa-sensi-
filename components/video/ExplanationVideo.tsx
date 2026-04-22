'use client';

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, SpringConfig, spring, Sequence } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont();

interface ExplanationVideoProps {
  problem: string;
  code: string;
  language: string;
  detailedExplanation?: string;
}

export const ExplanationVideo: React.FC<ExplanationVideoProps> = ({ problem, code, language, detailedExplanation }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Animations
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const explanationText = detailedExplanation || `To master ${problem}, one must understand the underlying structure. Efficiency is not just about speed, but about the path taken through the data.`;

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', fontFamily, overflow: 'hidden' }}>
      {/* Manga Background Texture */}
      <div className="absolute inset-0 opacity-10" style={{ 
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }} />

      {/* Border */}
      <div className="absolute inset-4 border-8 border-black" />

      {/* Sequence 1: Title */}
      <Sequence durationInFrames={fps * 2}>
        <AbsoluteFill className="flex items-center justify-center">
          <div style={{ transform: `scale(${scale})` }} className="text-center">
            <h1 className="text-8xl font-black italic uppercase tracking-tighter bg-yellow-300 px-8 py-4 border-8 border-black inline-block transform -rotate-2">
              Sensei&apos;s Secret
            </h1>
            <div className="mt-8 text-4xl font-bold bg-black text-white px-6 py-2 inline-block transform rotate-1">
              {problem}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 2: Problem Walkthrough */}
      <Sequence from={fps * 2} durationInFrames={fps * 6}>
        <AbsoluteFill className="p-20 flex flex-col">
          <div className="flex-1 border-4 border-black p-8 bg-blue-50 relative overflow-hidden">
            <div className="absolute -top-6 -left-4 bg-black text-white px-4 py-1 font-bold italic uppercase">
              The Wisdom
            </div>
            <div className="text-2xl font-medium leading-relaxed">
              {explanationText.split('\n').map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
            </div>
            
            {/* Visual Elements */}
            <div className="mt-8 flex justify-around">
              {[1, 2, 3].map((i) => {
                const nodeScale = spring({
                  frame: frame - (fps * 2) - (i * 10),
                  fps,
                  config: { damping: 10 }
                });
                return (
                  <div key={i} style={{ transform: `scale(${nodeScale})` }} className="w-24 h-24 rounded-full border-4 border-black bg-white flex items-center justify-center text-3xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {i}
                  </div>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 3: Code Reveal */}
      <Sequence from={fps * 8} durationInFrames={fps * 4}>
        <AbsoluteFill className="p-20 flex flex-col">
          <div className="flex-1 border-4 border-black p-8 bg-zinc-900 text-zinc-100 font-mono relative overflow-hidden">
            <div className="absolute -top-6 -left-4 bg-yellow-400 text-black px-4 py-1 font-bold italic uppercase border-2 border-black">
              The Implementation
            </div>
            <pre className="text-xl leading-tight">
              {code.split('\n').slice(0, 15).join('\n')}
              {code.split('\n').length > 15 && '\n// ... more wisdom follows'}
            </pre>
            
            {/* Manga Speed Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="absolute bg-white h-1" style={{ 
                  width: '200px', 
                  top: `${i * 10}%`, 
                  left: '-100px',
                  transform: `rotate(${i * 5}deg)`
                }} />
              ))}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Outro */}
      <Sequence from={fps * 12}>
        <AbsoluteFill className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-9xl font-black italic uppercase tracking-tighter transform -rotate-3 mb-4">
              FIN.
            </div>
            <p className="text-2xl font-bold bg-yellow-200 px-4 py-1 border-2 border-black inline-block">
              Mastery takes time, student.
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
