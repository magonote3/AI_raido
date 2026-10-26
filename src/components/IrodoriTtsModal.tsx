import React, { useState, useRef } from 'react';
import { 
  X, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Play, 
  Loader2, 
  ExternalLink,
  Sparkles,
  Music,
  Terminal,
  Copy,
  Check,
  Cpu,
  Server
} from 'lucide-react';

interface IrodoriTtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabled: boolean;
  onToggleEnabled: (val: boolean) => void;
  serverUrl: string;
  onServerUrlChange: (url: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  styleEmoji: string;
  onStyleEmojiChange: (emoji: string) => void;
  promptAudioName: string | null;
  promptAudioBase64: string | null;
  onPromptAudioChange: (name: string, base64: string) => void;
}

const EMOJI_STYLES = [
  { emoji: '😏', label: '妖艶・挑発', desc: '公式ミナト推奨。甘美な微笑みで運命を暴く' },
  { emoji: '🖤', label: '背徳・耽美', desc: '深みのある低音フォルマントで魅惑的に囁く' },
  { emoji: '🔮', label: '神秘・救済', desc: '古代数霊の深淵から魂を包み込む聖域残響トーン' },
  { emoji: '✨', label: '覚醒・真実', desc: '迷いを断ち切る明瞭で凛とした宣告トーン' },
  { emoji: '🥺', label: '哀れみ・慰撫', desc: '傷ついた魂に寄り添う優しいベルベットトーン' },
];

export const IrodoriTtsModal: React.FC<IrodoriTtsModalProps> = ({
  isOpen,
  onClose,
  enabled,
  onToggleEnabled,
  serverUrl,
  onServerUrlChange,
  apiKey,
  onApiKeyChange,
  styleEmoji,
  onStyleEmojiChange,
  promptAudioName,
  promptAudioBase64,
  onPromptAudioChange,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const isBuiltinMode =
    !serverUrl ||
    serverUrl.startsWith('builtin') ||
    serverUrl === 'http://localhost:8080/v1';

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/tts/irodori/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: serverUrl || 'builtin://irodori-engine', apiKey })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: data.message || 'Irodori-TTSエンジンが正常に稼働しています！'
        });
      } else {
        setTestResult({
          ok: false,
          message: data.message || 'サーバーからの応答が確認できませんでした。'
        });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        message: `接続エラー: ${e.message || '通信に失敗しました。'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePreviewCloneVoice = async () => {
    if (isPreviewingVoice) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPreviewingVoice(false);
      return;
    }

    setIsPreviewingVoice(true);
    try {
      const sampleText =
        '幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。';
      const res = await fetch('/api/tts/irodori/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          serverUrl: serverUrl || 'builtin://irodori-engine',
          apiKey,
          styleEmoji,
          promptAudioBase64,
          voice: 'minato'
        })
      });
      const data = await res.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        previewAudioRef.current = audio;
        audio.onended = () => setIsPreviewingVoice(false);
        audio.onerror = () => setIsPreviewingVoice(false);
        await audio.play();
      } else {
        setIsPreviewingVoice(false);
      }
    } catch {
      setIsPreviewingVoice(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      onPromptAudioChange(file.name, base64);
    };
    reader.readAsDataURL(file);
  };

  const quickStartCommands = `# 外部GPU (ローカルPCやGoogle Colab) で本家Irodori-TTSを動かす場合のみ:
git clone https://github.com/Aratako/Irodori-TTS-Server.git
cd Irodori-TTS-Server
pip install -r requirements.txt
python app.py --port 8080`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(quickStartCommands);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0e0e14] border border-rose-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-rose-950/40 overflow-hidden text-white font-sans">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-rose-950/30 via-purple-950/20 to-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
              <span className="text-xl">🌸</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-rose-200">
                  Irodori-TTS ボイスクローン設定
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  アプリ内蔵エンジン搭載・回数無制限
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 font-sans">
                外部サーバー不要で数霊師ミナトの高品位クローン音声（MP3）を無制限に合成
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Toggle Enable/Disable */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-black border border-rose-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  Irodori-TTS 音声合成モード
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/10 text-white/50 border-white/15'
                }`}>
                  {enabled ? '● クローンON（有効）' : '○ クローンOFF'}
                </span>
              </div>
              <span className="text-xs text-white/60 block">
                ONにすると、Geminiの1日10回制限を受けずに全編の番組音声（MP3）を無制限に生成します
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleEnabled(!enabled)}
              className={`w-14 h-8 rounded-full transition-all relative cursor-pointer border shrink-0 ${
                enabled
                  ? 'bg-rose-500 border-rose-400'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <div className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-0.5 ${
                enabled ? 'left-7 shadow-md' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Engine Mode Selector: Built-in vs External */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-white/90 block">
              ① 動作エンジンの選択
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onServerUrlChange('builtin://irodori-engine');
                  onToggleEnabled(true);
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isBuiltinMode
                    ? 'border-emerald-400/70 bg-emerald-950/30 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-xs">
                    <Cpu className="w-4 h-4" />
                    <span>アプリ内蔵エンジン【推奨】</span>
                  </div>
                  {isBuiltinMode && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  外部サーバーやGPUの起動は一切不要。アプリ内部のニューラル音声＆FFmpeg音響マスタリングで即座に無制限生成します。
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isBuiltinMode) {
                    onServerUrlChange('https://your-irodori-server.trycloudflare.com/v1');
                  }
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  !isBuiltinMode
                    ? 'border-rose-400/70 bg-rose-950/30 shadow-lg shadow-rose-950/30 ring-1 ring-rose-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-300 font-black text-xs">
                    <Server className="w-4 h-4" />
                    <span>外部GPUサーバー連携</span>
                  </div>
                  {!isBuiltinMode && <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Google Colabや自前GPU PCで起動した外部の <code className="text-rose-200">Irodori-TTS-Server</code> URLに接続します。
                </p>
              </button>
            </div>
          </div>

          {/* Built-in Test or External URL Input */}
          {isBuiltinMode ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>アプリ内蔵 Irodori-TTS エンジン稼働中</span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    設定不要でこのまま使えます。下のボタンから内蔵エンジンの稼働テストとサンプル試聴が行えます。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>確認中...</span>
                      </>
                    ) : (
                      <span>動作確認テスト</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePreviewCloneVoice}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                  >
                    {isPreviewingVoice ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                        <span>■ 試聴停止</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>▶ 内蔵ボイスを試聴</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-500/15 border-red-500/40 text-red-200'
                }`}>
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <label className="text-xs font-bold text-white/90 flex items-center justify-between">
                <span>外部 Irodori-TTS サーバー接続URL (OpenAI互換エンドポイント)</span>
                <a
                  href="https://github.com/Aratako/Irodori-TTS-Server"
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>GitHub Irodori-TTS-Server</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => onServerUrlChange(e.target.value)}
                  placeholder="https://xxxx.trycloudflare.com/v1"
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>検証中...</span>
                    </>
                  ) : (
                    <span>接続テスト</span>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="pt-1">
                <label className="text-[11px] font-bold text-white/70 flex items-center justify-between mb-1">
                  <span>APIキー / Authorizationトークン（任意）</span>
                  <span className="text-[10px] text-white/40 font-mono">※未入力時は自動で Bearer ヘッダーを付与</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="空欄でOK（認証設定時のみ入力）"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/70 flex items-center gap-1.5 font-mono">
                    <Terminal className="w-3.5 h-3.5 text-rose-400" />
                    <span>外部GPU環境での起動コマンド</span>
                  </span>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'コピー完了' : 'コピー'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/80 border border-white/10 text-[10px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                  {quickStartCommands}
                </pre>
              </div>
            </div>
          )}

          {/* Reference Audio Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/90 block">
              ② クローン基準サンプルボイス音源（WAV / MP3）
            </label>
            
            <div className="p-4 rounded-2xl bg-black/50 border border-dashed border-white/20 hover:border-rose-400/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {promptAudioName || 'S_6_minato.wav（デフォルト事前登録済み）'}
                  </span>
                  <span className="text-[10px] text-white/50 block font-mono">
                    {promptAudioBase64 ? 'カスタム参照音声のプロファイル適用中 (Voice Clone Ready)' : '公式ミナトの音響プロファイルを使用中'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/wav,audio/mp3,audio/m4a"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>参照音声を変更 (WAV/MP3)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Emoji Style Control */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/90 block">
              ③ Irodori-TTS 絵文字スタイル制御（発話の感情・音響フォルマント演出）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMOJI_STYLES.map((st) => (
                <button
                  key={st.emoji}
                  type="button"
                  onClick={() => onStyleEmojiChange(st.emoji)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    styleEmoji === st.emoji
                      ? 'bg-rose-500/20 border-rose-400 text-white shadow-md shadow-rose-500/10'
                      : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="text-xl">{st.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block text-white">{st.label}</span>
                    <span className="text-[10px] text-white/50 block truncate">{st.desc}</span>
                  </div>
                  {styleEmoji === st.emoji && (
                    <CheckCircle2 className="w-4 h-4 text-rose-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/40">
          <span className="text-xs text-white/60">
            🌸 アプリ内蔵エンジンにより外部サーバー不要で常にMP3音声が生成されます
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-500/25 cursor-pointer active:scale-95"
          >
            設定を保存して閉じる
          </button>
        </div>

      </div>
    </div>
  );
};
