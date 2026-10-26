import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';
import { TranscriptLine } from '../types';

interface TranscriptProps {
  transcript: TranscriptLine[];
  currentTime: number;
  onSeek: (time: number) => void;
  isScriptMode?: boolean;
}

export function Transcript({ transcript, currentTime, onSeek, isScriptMode = false }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeIndex = transcript.findIndex(line => currentTime >= line.start && currentTime < line.end);
  const lastIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!isScriptMode && activeIndex !== lastIndexRef.current && activeIndex !== -1) {
      const isJump = Math.abs(activeIndex - lastIndexRef.current) > 1;
      lastIndexRef.current = activeIndex;
      
      const container = containerRef.current;
      const element = document.getElementById(`transcript-line-${activeIndex}`);
      
      if (container && element) {
        let targetScrollTop = 0;
        const prevElement = document.getElementById(`transcript-line-${activeIndex - 1}`);
        
        if (prevElement) {
          targetScrollTop = prevElement.offsetTop - 80;
        }
        
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: isJump ? 'auto' : 'smooth'
        });
      }
    }
  }, [activeIndex, isScriptMode]);

  const handleCopyLine = (e: React.MouseEvent, text: string, index: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto scrollbar-hide px-6 md:px-8 pt-10 pb-80"
    >
      <div className="flex flex-col gap-7">
        {transcript.map((line, index) => {
          const isActive = !isScriptMode && currentTime >= line.start && currentTime < line.end;
          const isCaller =
            line.speaker?.includes('リスナー') ||
            line.speaker?.includes('仔羊') ||
            line.speaker?.toLowerCase().includes('listener') ||
            line.speaker?.toLowerCase().includes('caller');

          return (
            <motion.div
              key={`${line.start}-${index}`}
              id={`transcript-line-${index}`}
              ref={isActive ? activeLineRef : null}
              initial={{ opacity: 0.1 }}
              animate={{ opacity: 1 }}
              onClick={() => onSeek(line.start)}
              className={`relative cursor-pointer transition-all duration-300 group rounded-2xl p-4 md:p-5 border ${
                isScriptMode
                  ? isCaller
                    ? 'bg-emerald-950/15 border-emerald-500/20 hover:border-emerald-400/40 pl-6'
                    : 'bg-white/[0.03] border-white/10 hover:border-amber-400/30 pl-6'
                  : isActive
                  ? 'bg-white/[0.04] border-white/15 pl-10'
                  : 'border-transparent hover:bg-white/[0.02] pl-10'
              }`}
            >
              {(isActive || isScriptMode) && (
                <motion.div 
                  layoutId={isActive ? "activeBar" : undefined}
                  className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${
                    isScriptMode
                      ? isCaller
                        ? 'bg-emerald-400/70'
                        : 'bg-amber-400/70'
                      : 'bg-gradient-to-b from-[#4285f4] to-[#f4b400] shadow-[0_0_15px_rgba(66,133,244,0.4)]'
                  }`}
                />
              )}
              
              <div className="flex gap-4 md:gap-8 items-start justify-between">
                <span className={`font-mono text-xs pt-1 tracking-wider w-12 shrink-0 select-none ${
                  isActive
                    ? 'text-[#5770ff] font-bold'
                    : isScriptMode
                    ? 'text-amber-300/70 font-semibold'
                    : 'text-[#4e5b9c] font-semibold'
                }`}>
                  {formatTime(line.start)}
                </span>

                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {line.speaker && (
                      <span className={`text-[11px] uppercase tracking-[0.2em] font-extrabold ${
                        isCaller
                          ? 'text-emerald-400'
                          : isActive || isScriptMode
                          ? 'text-amber-300'
                          : 'text-neutral-400'
                      }`}>
                        {line.speaker}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLine(e, line.text, index)}
                      className="opacity-70 group-hover:opacity-100 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-white/70 hover:text-white flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      title="このセリフをコピー"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">コピー済</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>コピー</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className={`leading-relaxed transition-all duration-300 text-base md:text-lg font-medium tracking-tight select-text ${
                    isScriptMode || isActive
                      ? 'text-white/95'
                      : 'text-neutral-300 group-hover:text-white'
                  }`}>
                    {line.text}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
