import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Video, Download, Play, Pause, RefreshCw, CheckCircle2, 
  Sparkles, Layers, Clock, AlertCircle, Volume2, VolumeX, 
  Share2, Eye, ShieldCheck, Film, Tv
} from 'lucide-react';
import { RadioShow } from '../types';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: RadioShow;
  initialAspectRatio?: '16:9' | '9:16' | '1:1';
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  show,
  initialAspectRatio = '16:9',
}) => {
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>(initialAspectRatio);
  const [exportDuration, setExportDuration] = useState<'15' | '30' | '60' | 'full'>('full');
  const [videoStyle, setVideoStyle] = useState<'breaking_news' | 'golden_mandala' | 'cyber_neon'>('breaking_news');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeWaveform, setIncludeWaveform] = useState(true);

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCompleteUrl, setExportCompleteUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Calculate target duration in seconds
  const targetDurationSec = exportDuration === 'full' 
    ? Math.max(15, show.duration || 60)
    : parseInt(exportDuration, 10);

  // Resolution setup
  const getResolution = () => {
    switch (aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 720, height: 720 };
      case '16:9':
      default:
        return { width: 1280, height: 720 };
    }
  };

  const { width: canvasWidth, height: canvasHeight } = getResolution();

  // Load cover image into memory for canvas rendering
  const coverImageObjRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (show.coverImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = show.coverImage;
      img.onload = () => {
        coverImageObjRef.current = img;
      };
    }
  }, [show.coverImage]);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isOpen]);

  // Active transcript line at given time
  const getCurrentTranscript = (time: number) => {
    if (!show.transcript || show.transcript.length === 0) return null;
    return show.transcript.find(t => time >= t.start && time < t.end) || show.transcript[0];
  };

  // Canvas drawing function for a specific timestamp
  const drawFrame = (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => {
    // 1. Dark cosmic gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (videoStyle === 'breaking_news') {
      bgGrad.addColorStop(0, '#1a040b');
      bgGrad.addColorStop(0.5, '#0b0214');
      bgGrad.addColorStop(1, '#020005');
    } else if (videoStyle === 'golden_mandala') {
      bgGrad.addColorStop(0, '#1e1402');
      bgGrad.addColorStop(0.5, '#0f0a1c');
      bgGrad.addColorStop(1, '#020208');
    } else {
      bgGrad.addColorStop(0, '#041527');
      bgGrad.addColorStop(0.5, '#09051c');
      bgGrad.addColorStop(1, '#020108');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Render cover image with cinematic subtle zoom/pan
    if (coverImageObjRef.current && coverImageObjRef.current.complete) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      const zoom = 1 + Math.sin(time * 0.4) * 0.03;
      const drawW = w * zoom;
      const drawH = h * zoom;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;
      ctx.drawImage(coverImageObjRef.current, offsetX, offsetY, drawW, drawH);
      ctx.restore();
    }

    // 3. Vignette & dark tint overlay for readability
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0.25)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // 4. Subtle sacred geometry animated circles
    ctx.save();
    ctx.strokeStyle = videoStyle === 'golden_mandala' ? 'rgba(251, 191, 36, 0.25)' : 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 1.5;
    const geomX = aspectRatio === '9:16' ? w / 2 : w * 0.82;
    const geomY = aspectRatio === '9:16' ? h * 0.38 : h * 0.45;
    const geomR = aspectRatio === '9:16' ? 120 : 150;

    ctx.save();
    ctx.translate(geomX, geomY);
    ctx.rotate(time * 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, geomR, 0, Math.PI * 2);
    ctx.stroke();

    // 12-pointed star pattern
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const r = i % 2 === 0 ? geomR : geomR * 0.55;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Sacred center number
    ctx.restore();
    ctx.save();
    ctx.translate(geomX, geomY);
    ctx.fillStyle = '#0f051d';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(show.luckyNumber || '8', 0, -2);

    ctx.fillStyle = '#fef08a';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.fillText('数霊核', 0, 24);
    ctx.restore();
    ctx.restore();

    // 5. Animated Audio Waveform / Frequency Equalizer Bars
    if (includeWaveform) {
      ctx.save();
      const waveY = aspectRatio === '9:16' ? h * 0.62 : h * 0.66;
      const waveW = aspectRatio === '9:16' ? w * 0.88 : w * 0.48;
      const waveX = aspectRatio === '9:16' ? w * 0.06 : w * 0.06;
      const numBars = 32;
      const barWidth = waveW / numBars - 3;

      for (let i = 0; i < numBars; i++) {
        // Pseudo animated frequency height with pleasant rhythm
        const freq = Math.sin(time * 6 + i * 0.4) * 0.5 + Math.cos(time * 3 - i * 0.2) * 0.5;
        const barH = Math.max(6, Math.abs(freq) * 44 + (Math.sin(time * 12 + i) * 10));

        const barX = waveX + i * (barWidth + 3);
        const bx = barX;
        const by = waveY - barH / 2;

        const barGrad = ctx.createLinearGradient(0, by, 0, by + barH);
        barGrad.addColorStop(0, '#f59e0b');
        barGrad.addColorStop(0.5, '#ec4899');
        barGrad.addColorStop(1, '#6366f1');

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(bx, by, barWidth, barH, 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Top Header Scoop Bar
    ctx.save();
    // Red BREAKING NEWS Badge
    const topPadding = 24;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(24, topPadding, 170, 32, 6);
    ctx.fill();

    // Pulsing live dot
    const pulseAlpha = Math.abs(Math.sin(time * 4));
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulseAlpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(42, topPadding + 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('● BREAKING SCOOP', 56, topPadding + 21);

    // Authority Metric badge
    const metricText = show.anchoredMetric || '的中解析率 89.4%';
    ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(204, topPadding, 160, 32, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c7d2fe';
    ctx.font = '800 12px sans-serif';
    ctx.fillText(`📊 ${metricText}`, 216, topPadding + 20);

    // Timecode & 4K badge
    const timeFormatted = `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
    const tcX = w - 160;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tcX, topPadding, 136, 32, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 12px monospace';
    ctx.fillText(`HD ${timeFormatted}`, tcX + 16, topPadding + 21);
    ctx.restore();

    // 7. News Scoop Headline & Loss Aversion Hook
    ctx.save();
    const hlY = aspectRatio === '9:16' ? 100 : 88;
    // Byline
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('【緊急特報】妖美なる運命鑑定家・数霊師ミナト 独占解析', 26, hlY);

    // Headline
    const headline = show.newsHeadline || show.title || '【緊急特報】知らずに過ごすと9割損する…運命の数霊反転データ';
    const isPortrait = aspectRatio === '9:16';
    const maxCharsPerLine = isPortrait ? 15 : 22;
    const headlineFontSize = isPortrait ? (headline.length > 30 ? 20 : 23) : (headline.length > 35 ? 24 : 28);
    const headlineLineHeight = isPortrait ? headlineFontSize + 8 : headlineFontSize + 10;
    ctx.font = `900 ${headlineFontSize}px sans-serif`;

    const hlLines: string[] = [];
    if (headline.length <= maxCharsPerLine) {
      hlLines.push(headline);
    } else {
      hlLines.push(headline.slice(0, maxCharsPerLine));
      const rest = headline.slice(maxCharsPerLine);
      if (rest.length <= maxCharsPerLine) {
        hlLines.push(rest);
      } else {
        hlLines.push(rest.slice(0, maxCharsPerLine));
        hlLines.push(rest.length > maxCharsPerLine ? rest.slice(maxCharsPerLine, maxCharsPerLine * 2 - 1) + '…' : rest.slice(maxCharsPerLine));
      }
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    hlLines.forEach((lineStr, lineIdx) => {
      ctx.fillStyle = lineIdx === 0 ? '#ffffff' : '#fbbf24';
      ctx.fillText(lineStr, 26, hlY + 32 + lineIdx * headlineLineHeight);
    });

    // Loss aversion bar
    const lossText = show.lossAversionHook || '⚠️ 損失回避警告: 今日の数霊波動を見逃すと開運の好機を逃します';
    const lossY = hlY + 32 + hlLines.length * headlineLineHeight + 8;
    const lossBarW = Math.min(w - 52, isPortrait ? w - 52 : 620);
    ctx.fillStyle = 'rgba(69, 10, 10, 0.85)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(26, lossY, lossBarW, 28, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = '800 11px sans-serif';
    const maxLossChars = isPortrait ? 26 : 44;
    const safeLossText = lossText.length > maxLossChars ? lossText.slice(0, maxLossChars - 1) + '…' : lossText;
    ctx.fillText(safeLossText, 36, lossY + 18);
    ctx.restore();

    // 8. Live Subtitle Box (Sync with active speaker)
    if (includeSubtitles) {
      const activeLine = getCurrentTranscript(time);
      if (activeLine) {
        ctx.save();
        const subH = aspectRatio === '9:16' ? 160 : 100;
        const subY = h - subH - 60;
        const subW = w - 48;

        // Glassmorphic subtitle background
        ctx.fillStyle = 'rgba(8, 5, 20, 0.88)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(24, subY, subW, subH, 12);
        ctx.fill();
        ctx.stroke();

        // Speaker Badge
        const isMinato = activeLine.speaker.includes('ミナト') || activeLine.speaker.includes('Minato');
        const badgeGrad = ctx.createLinearGradient(0, subY + 12, 0, subY + 36);
        if (isMinato) {
          badgeGrad.addColorStop(0, '#f59e0b');
          badgeGrad.addColorStop(1, '#b45309');
        } else {
          badgeGrad.addColorStop(0, '#8b5cf6');
          badgeGrad.addColorStop(1, '#6d28d9');
        }
        ctx.fillStyle = badgeGrad;
        ctx.beginPath();
        ctx.roundRect(38, subY + 12, 140, 24, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isMinato ? '🎙️ 数霊師ミナト' : '📞 リスナー相談者', 108, subY + 28);

        // Subtitle Text (Word wrapping for Japanese)
        ctx.fillStyle = '#ffffff';
        const fontSize = activeLine.text.length > 70 ? 14 : 16;
        ctx.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;

        const maxSubCharsPerLine = aspectRatio === '9:16' ? 22 : 40;
        const text = activeLine.text;
        const subLines: string[] = [];
        for (let i = 0; i < text.length; i += maxSubCharsPerLine) {
          subLines.push(text.slice(i, i + maxSubCharsPerLine));
        }

        const maxVisibleLines = aspectRatio === '9:16' ? 5 : 3;
        subLines.slice(0, maxVisibleLines).forEach((lineStr, lineIdx) => {
          ctx.fillText(lineStr, 40, subY + 52 + lineIdx * (fontSize + 6));
        });

        ctx.restore();
      }
    }

    // 9. Bottom Running Marquee / News Ticker
    ctx.save();
    const tickerH = 44;
    const tickerY = h - tickerH;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, tickerY, w, tickerH);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, tickerY);
    ctx.lineTo(w, tickerY);
    ctx.stroke();

    // Red LIVE label
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, tickerY, 90, tickerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE SCOOP', 45, tickerY + 26);

    // Running marquee text
    const tickerMsg = `【速報・数霊運命解析】本日最強の数霊ナンバーは『${show.luckyNumber || '8'}』/ 共鳴1位は『${show.bestSign || 'おひつじ座'}』/ 詳しいお告げ・損しない開運法はプロフィールのURLへ（note・substack・medium公開中）/ リスナーさんに今日も幸福共鳴の幸あれ`;
    const tickerScroll = (time * 65) % (w * 1.5);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(tickerMsg, 110 - (tickerScroll % w), tickerY + 26);
    ctx.fillText(tickerMsg, 110 - (tickerScroll % w) + w, tickerY + 26);
    ctx.restore();
  };

  // Preview Render Loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();
    let currentT = previewTime;

    const renderLoop = (timestamp: number) => {
      if (isPreviewPlaying) {
        const delta = (timestamp - startTime) / 1000;
        currentT = (previewTime + delta) % targetDurationSec;
        setPreviewTime(currentT);
      }
      drawFrame(ctx, currentT, canvas.width, canvas.height);
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isOpen, isPreviewPlaying, aspectRatio, videoStyle, includeSubtitles, includeWaveform, targetDurationSec]);

  // Preview Playback Toggle
  const togglePreviewPlay = () => {
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    } else {
      setIsPreviewPlaying(true);
      if (previewAudioRef.current && show.audioUrl) {
        previewAudioRef.current.currentTime = previewTime;
        previewAudioRef.current.play().catch(() => {});
      }
    }
  };

  // -------------------------------------------------------------
  // Real Video Export Function using MediaRecorder & Canvas Stream
  // -------------------------------------------------------------
  const handleStartExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportCompleteUrl(null);

    // Stop current preview
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      if (previewAudioRef.current) previewAudioRef.current.pause();
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2D context from canvas');

      // Create an audio stream if audioUrl exists
      let audioStreamTrack: MediaStreamTrack | null = null;
      let exportAudio: HTMLAudioElement | null = null;
      let audioCtx: AudioContext | null = null;

      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (show.audioUrl) {
          exportAudio = new Audio(show.audioUrl);
          exportAudio.crossOrigin = 'anonymous';
          const source = audioCtx.createMediaElementSource(exportAudio);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination); // also let user hear or keep connected
          audioStreamTrack = dest.stream.getAudioTracks()[0] || null;
        } else {
          // Provide subtle cosmic sacred ambient sound (432Hz sine wave)
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(432, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
          osc.connect(gain);
          const dest = audioCtx.createMediaStreamDestination();
          gain.connect(dest);
          osc.start();
          audioStreamTrack = dest.stream.getAudioTracks()[0] || null;
        }
      } catch (audioErr) {
        console.warn('Audio capture warning, proceeding with visual-only video track:', audioErr);
      }

      // Capture stream from canvas at 30 fps
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream();

      // Add video track
      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));

      // Add audio track if available
      if (audioStreamTrack) {
        combinedStream.addTrack(audioStreamTrack);
      }

      // Check supported MIME types - prioritize native MP4 if browser supports it, otherwise WebM and convert via backend FFmpeg
      let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3000000, // 3.0 Mbps crisp broadcast HD
      });

      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        const cleanTitle = (show.newsHeadline || show.title || 'minato_video').replace(/[^\w\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g, '_').slice(0, 24);
        const targetFilename = `${cleanTitle}_${aspectRatio.replace(':', 'x')}_${Date.now()}.mp4`;

        let finalVideoUrl = "";

        // If native MP4 was recorded directly
        if (mimeType.includes('mp4')) {
          finalVideoUrl = URL.createObjectURL(rawBlob);
        } else {
          // Convert WebM recording to high-compatibility MP4 (H.264 / AAC) via backend FFmpeg
          setExportProgress(98);
          try {
            const convRes = await fetch('/api/video/convert-to-mp4', {
              method: 'POST',
              headers: {
                'Content-Type': rawBlob.type || 'video/webm',
              },
              body: rawBlob,
            });

            if (convRes.ok) {
              const mp4Blob = await convRes.blob();
              finalVideoUrl = URL.createObjectURL(mp4Blob);
              console.log("[VideoExportModal] Successfully converted to universal MP4 (H.264/AAC)!");
            } else {
              console.warn("[VideoExportModal] Server MP4 conversion returned fallback, using direct video stream");
              finalVideoUrl = URL.createObjectURL(rawBlob);
            }
          } catch (convErr) {
            console.warn("[VideoExportModal] Network notice during MP4 conversion, using direct video blob:", convErr);
            finalVideoUrl = URL.createObjectURL(rawBlob);
          }
        }

        setExportCompleteUrl(finalVideoUrl);
        setIsExporting(false);
        setExportProgress(100);

        // Auto trigger MP4 download
        const a = document.createElement('a');
        a.href = finalVideoUrl;
        a.download = targetFilename;
        a.click();

        // Clean up audio
        if (exportAudio) {
          exportAudio.pause();
        }
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
      };

      // Start recording
      recorder.start(100);
      if (exportAudio) {
        exportAudio.currentTime = 0;
        exportAudio.play().catch(() => {});
      }

      // Render frames continuously for the target duration
      const totalSec = targetDurationSec;
      const exportStart = performance.now();

      const exportFrame = () => {
        const elapsed = (performance.now() - exportStart) / 1000;
        const progressPct = Math.min(99, Math.round((elapsed / totalSec) * 100));
        setExportProgress(progressPct);

        drawFrame(ctx, elapsed, canvas.width, canvas.height);

        if (elapsed < totalSec && isExporting) {
          requestAnimationFrame(exportFrame);
        } else {
          // Recording complete
          setExportProgress(100);
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }
      };

      requestAnimationFrame(exportFrame);

    } catch (err: any) {
      console.error('Video Export Error:', err);
      setExportError(err.message || '動画の書き出し中にエラーが発生しました');
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-[#090514]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Hidden audio element for preview sync */}
          {show.audioUrl ? (
            <audio
              ref={previewAudioRef}
              src={show.audioUrl}
              onEnded={() => setIsPreviewPlaying(false)}
              className="hidden"
            />
          ) : null}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                    🎬 動画として書き出し（Video Export）
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    HD SCOOP
                  </span>
                </div>
                <p className="text-xs text-white/50 font-sans">
                  数霊師ミナトの特報ニュース映像・リアルタイム字幕テロップ・波形ビジュアライザー動画を生成
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body: Left Preview, Right Settings */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Video Preview Window (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 rounded-2xl border border-white/5 p-4 relative overflow-hidden group">
              <div 
                className="relative flex items-center justify-center overflow-hidden rounded-xl shadow-2xl border border-white/10 bg-black"
                style={{
                  width: aspectRatio === '9:16' ? '270px' : aspectRatio === '1:1' ? '360px' : '100%',
                  aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9',
                  maxHeight: '440px',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  className="w-full h-full object-contain"
                />

                {/* Overlay Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-transform">
                    {isPreviewPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </div>
                </button>

                {/* Progress bar overlay during export */}
                {isExporting && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                    <div className="w-16 h-16 relative flex items-center justify-center mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                      <Film className="w-7 h-7 text-amber-400" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      🎬 高画質動画を書き出し中...
                    </h4>
                    <p className="text-xs text-white/60 mb-3 font-sans">
                      映像フレーム・字幕テロップ・音声を結合エンコード中 ({exportProgress}%)
                    </p>
                    <div className="w-full max-w-xs h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 transition-all duration-200"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Controls Bar */}
              <div className="w-full flex items-center justify-between mt-3 px-2 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePreviewPlay}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPreviewPlaying ? '一時停止' : 'プレビュー再生'}</span>
                  </button>
                  <span className="font-mono text-white/40">
                    {Math.floor(previewTime / 60)}:{(Math.floor(previewTime % 60)).toString().padStart(2, '0')} / {Math.floor(targetDurationSec / 60)}:{(Math.floor(targetDurationSec % 60)).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded-md border border-white/5">
                    解像度: {canvasWidth}x{canvasHeight}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Export Settings & Action (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
              
              <div className="space-y-4">
                {/* 1. Aspect Ratio Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-amber-400" />
                    <span>画面比率（アスペクト比）</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '16:9', label: '16:9 横型', desc: 'YouTube / PC' },
                      { id: '9:16', label: '9:16 縦型', desc: 'Shorts / TikTok' },
                      { id: '1:1', label: '1:1 正方形', desc: 'Instagram / X' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setAspectRatio(fmt.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          aspectRatio === fmt.id
                            ? 'border-amber-400/80 bg-amber-400/15 text-white font-bold shadow-lg shadow-amber-500/10'
                            : 'border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="text-xs">{fmt.label}</div>
                        <div className="text-[10px] text-white/40 mt-0.5 font-sans">{fmt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Export Duration Range */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>書き出し範囲・動画の長さ</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '15', label: '⚡ 15秒 特報ハイライト', tip: 'SNS拡散に最適・超速書き出し' },
                      { id: '30', label: '📱 30秒 ショート / リール', tip: 'Shorts/TikTok標準' },
                      { id: '60', label: '⏳ 60秒 ダイジェスト', tip: '重要アドバイス網羅' },
                      { id: 'full', label: '🎬 番組フル尺（全編）', tip: '完全版動画' },
                    ].map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setExportDuration(dur.id as any)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          exportDuration === dur.id
                            ? 'border-sky-400/80 bg-sky-400/15 text-white font-bold'
                            : 'border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="text-xs">{dur.label}</div>
                        <div className="text-[10px] text-white/40 font-sans">{dur.tip}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Visual Theme */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>演出スタイル</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'breaking_news', label: '🚨 特報ニュース', color: 'border-red-500/50' },
                      { id: 'golden_mandala', label: '🔮 黄金数霊', color: 'border-amber-500/50' },
                      { id: 'cyber_neon', label: '🎙️ ネオンサイバー', color: 'border-blue-500/50' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setVideoStyle(style.id as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          videoStyle === style.id
                            ? `border-white/80 bg-white/10 text-white font-bold ${style.color}`
                            : 'border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/[0.06]'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Subtitle & Waveform Toggles */}
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/[0.03]">
                    <span className="text-xs font-semibold text-white/80">💬 リアルタイム字幕テロップ</span>
                    <input
                      type="checkbox"
                      checked={includeSubtitles}
                      onChange={(e) => setIncludeSubtitles(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/[0.03]">
                    <span className="text-xs font-semibold text-white/80">📊 音声波形ビジュアライザー</span>
                    <input
                      type="checkbox"
                      checked={includeWaveform}
                      onChange={(e) => setIncludeWaveform(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* 5. Closing statement preview badge */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>公式・締めの一言（動画・ラジオ共通）</span>
                  </div>
                  <p className="text-[10px] text-white/70 leading-relaxed font-sans">
                    「詳しいお告げや毎日を損したくないと思ったあなたは、プロフィールのURLを見てくださいね。note・substack・mediumに詳しい内容がありますので、お暇でしたら一度遊びに来てくださいね。では、リスナーさんに今日も幸福共鳴の幸あれ。ミナトでした。」
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                {exportError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{exportError}</span>
                  </div>
                )}

                {exportCompleteUrl && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold">🎬 MP4動画の書き出しと保存が完了しました！</span>
                    </div>
                    <a
                      href={exportCompleteUrl}
                      download={`minato_fortune_video_${Date.now()}.mp4`}
                      className="px-2.5 py-1 bg-emerald-500/30 hover:bg-emerald-500/50 rounded-lg font-bold text-white transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      MP4再保存
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleStartExport}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Video className="w-4 h-4 text-amber-200" />
                  <span>
                    {isExporting ? `MP4生成・エンコード中... (${exportProgress}%)` : '🎬 MP4形式で動画を書き出す（H.264 / AAC）'}
                  </span>
                </button>

                <p className="text-[11px] text-center text-white/50 font-sans">
                  ✨ スマホ・YouTube・TikTok・X・Instagram全対応の標準MP4（H.264 / AAC形式）で出力されます
                </p>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
