import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Volume2, VolumeX, Info, List, ChevronDown, ChevronUp, Sparkles, Settings2, Clock, Radio,
  TerminalSquare, CheckCircle2, Loader2, Bot, Download, Lock, Key, ShieldAlert, Check,
  HelpCircle, User, AlertCircle, RefreshCw, Trash2, ChevronLeft, Share2, Copy, ExternalLink, Globe,
  Star, Moon, Sun, Phone, FileText, Send, Zap, Award, Languages, Flame,
  Film, Video, Tv, Settings
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { MOCK_SHOW, MOCK_SHOW_2, transformShow } from './data';
import { Transcript } from './components/Transcript';
import { VideoExportModal } from './components/VideoExportModal';
import { IrodoriTtsModal } from './components/IrodoriTtsModal';
import { saveUserShow, getUserShows, deleteUserShow } from './lib/clientDb';

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const IS_DEV = !!(import.meta as any).env?.DEV;
// Dynamically generate the direct published/deployed link for sharing,
// completely bypassing the AI Studio editor/builder frame to ensure immediate end-user playback for colleagues
const getPublishedShareLink = (shareId: string) => {
  let origin = window.location.origin;

  // Dynamically map any AI Studio development box subdomain to the corresponding preprod/published/deployed subdomain
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  return `${origin}/?share_id=${shareId}`;
};

// Safe retrieval of query parameters supporting both inline (localhost) and nested iframe scenarios
const getQueryParam = (name: string): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Try parent referrer URL first (most common when running inside a dynamic AI Studio iframe)
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const val = referrerUrl.searchParams.get(name);
      if (val) return val;
    } catch (e) {
      console.error('Failed to parse document.referrer search params', e);
    }
  }

  // 2. Fallback to direct frame's URL
  try {
    const params = new URLSearchParams(window.location.search);
    const val = params.get(name);
    if (val) return val;
  } catch (e) {
    // ignore
  }

  return null;
};

// Dynamically extract the Applet ID from current window URL or referrer URL for robust, dynamic forking / cloning
const getAppletId = (): string => {
  const defaultAppId = '35815e49-e032-468d-893e-d0bb54764b77';
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // 1. Try the current frame's URL first
  try {
    const ownMatch = window.location.href.match(uuidRegex);
    if (ownMatch) {
      return ownMatch[0];
    }
  } catch (e) {
    // ignore
  }

  // 2. Try the parent referrer URL (typical when running inside an iframe in AI Studio)
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const match = referrerUrl.href.match(uuidRegex);
      if (match) {
        return match[0];
      }
    } catch (e) {
      // ignore
    }
  }

  return defaultAppId;
};

// Dynamically determine the correct AI Studio origin for Remixes without hardcoding internal staging or staging domains
const getAIStudioBuildUrl = (appletId: string): string => {
  let baseDomain = 'https://ai.studio';
  
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      const hostname = referrerUrl.hostname;
      // Automatically adapt to the parent host if it's the official AI Studio or any verified Google sandbox/staging origin
      if (
        hostname === 'ai.studio' || 
        hostname === 'aistudio.google.com' || 
        hostname.endsWith('.google.com') || 
        hostname.endsWith('.google')
      ) {
        baseDomain = referrerUrl.origin;
      }
    } catch (e) {
      // ignore
    }
  }

  return `${baseDomain}/build?clone=${appletId}`;
};

const RainbowBackground = () => (
  <>
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vh] rounded-full bg-[#ff00a2]/40 mix-blend-screen filter blur-[120px] animate-blob" />
      <div className="absolute top-[10%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-[#143dff]/40 mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute -bottom-[20%] left-[10%] w-[70vw] h-[70vh] rounded-full bg-[#43ff0d]/30 mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-[#ffc500]/30 mix-blend-screen filter blur-[120px] animate-blob animation-delay-6000" />
      <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vh] rounded-full bg-[#ff2a2a]/30 mix-blend-screen filter blur-[120px] animate-blob animation-delay-3000" />
    </div>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-[60px] z-0 pointer-events-none" />
  </>
);

export interface VoicePreset {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  desc: string;
  pitch: number;
  rate: number;
  geminiVoice: string;
  sampleJa: string;
  sampleEn: string;
}

export const MINATO_VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'official_alluring',
    name: '妖美と深淵（公式サンプルボイス）',
    subtitle: 'Official Enigmatic Oracle',
    tag: '公式音声・妖美',
    desc: '添付サンプルボイス「S_6_minato.wav」に準拠。落ち着きと神秘性を兼ね備え、迷える魂を幸福の共鳴へと導く艶やかなトーン。',
    pitch: 0.98,
    rate: 0.92,
    geminiVoice: 'Kore',
    sampleJa: '「幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。ここにたどり着いたあなたへ ほんの少しのお手伝いを。」',
    sampleEn: '"You who seek happiness. You who do not want to let happiness slip away. This is a sanctuary for seekers yearning for the resonance of bliss. Welcome to Minato\'s Place of Resonance."',
  },
  {
    id: 'decadent_oracle',
    name: '背徳の予言（蠱惑・サディスティック）',
    subtitle: 'Decadent Whispers',
    tag: '蠱惑・愉楽',
    desc: '運命の因果に足掻く人間を優雅に愛でる魅惑の声。逃れられない数の法則を甘美に囁きます。',
    pitch: 1.05,
    rate: 0.94,
    geminiVoice: 'Aoede',
    sampleJa: '「ふふっ……足掻けば足掻くほど絡め取られるのが数の因果律。さあ、私にあなたのすべてを委ねなさい。」',
    sampleEn: '"Fufu... the more desperately you struggle, the tighter the sacred numbers entangle you. Yield all of yourself to me."',
  },
  {
    id: 'velvet_salvation',
    name: '深層の救済（静謐ベルベット）',
    subtitle: 'Velvet Abyss Salvation',
    tag: '静謐・包容',
    desc: '冷ややかな微笑みの奥に潜む狂おしいほどの救済。傷ついた魂の波長を解きほぐす艶やかな中低音。',
    pitch: 0.88,
    rate: 0.9,
    geminiVoice: 'Fenrir',
    sampleJa: '「泣かないで。壊れかけたあなただからこそ、この数霊が甘美な救済をもたらすのよ。」',
    sampleEn: '"Do not cry. Because your soul is fractured, this sacred number will grant you the sweetest salvation."',
  },
  {
    id: 'pierce_truth',
    name: '審判の眼差し（冷徹・真実宣告）',
    subtitle: 'Pierce of Cosmic Truth',
    tag: '冷徹・覚醒',
    desc: '欺瞞や虚飾を一切許さず、運命の裏側を暴く研ぎ澄まされた声。痛烈な真実を容赦なく宣告します。',
    pitch: 1.0,
    rate: 0.98,
    geminiVoice: 'Zephyr',
    sampleJa: '「嘘は通じないわ。数霊の盤面には、あなたの欲望も恐怖もすべて映し出されているのよ。」',
    sampleEn: '"Lies have no power here. The sacred grid reflects every drop of your desire and dread."',
  },
];

export default function App() {
  const [view, setView] = useState<'home' | 'player' | 'generating'>('home');
  const [selectedShow, setSelectedShow] = useState(MOCK_SHOW);
  const [library, setLibrary] = useState([MOCK_SHOW, MOCK_SHOW_2]);
  
  // --- SHARING FLOW STATES ---
  const [isSharedPlaybackMode, setIsSharedPlaybackMode] = useState(false);
  const [sharedShowLoading, setSharedShowLoading] = useState(false);
  const [sharedShowError, setSharedShowError] = useState<string | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [mobileDisclaimerExpanded, setMobileDisclaimerExpanded] = useState(true);
  const [isSharingEnabled, setIsSharingEnabled] = useState(false);

  // --- FORTUNE RADIO STUDIO STATES (数霊師ミナト 4-STEP FLOW) ---
  const [radioMode, setRadioMode] = useState<'fortune' | 'general'>('fortune');
  
  // ① 日本語か英語を選択
  const [fortuneLanguage, setFortuneLanguage] = useState<'ja' | 'en'>('ja');
  
  // ② 占いのテキストを入力する
  const [fortuneTab, setFortuneTab] = useState<'paste' | 'auto_generate'>('paste');
  const [fortuneInputText, setFortuneInputText] = useState('');
  const [fortuneDate, setFortuneDate] = useState(new Date().toISOString().split('T')[0]);
  const [fortuneFocus, setFortuneFocus] = useState('');
  const [isGeneratingFortuneData, setIsGeneratingFortuneData] = useState(false);
  const [generatedFortunePreview, setGeneratedFortunePreview] = useState<any | null>(null);
  
  // ③ 声を選択する（サンプルボイスを事前に登録）→ キャラクター名は数霊師ミナト
  const [selectedVoicePresetId, setSelectedVoicePresetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('minato_selected_voice_preset') || 'official_alluring';
    }
    return 'official_alluring';
  });
  const handleSelectVoicePreset = (id: string) => {
    setSelectedVoicePresetId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('minato_selected_voice_preset', id);
    }
  };
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [sampleVoiceLoadingId, setSampleVoiceLoadingId] = useState<string | null>(null);

  // --- 🌸 Irodori-TTS Built-in & External Integration State ---
  const [irodoriEnabled, setIrodoriEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('irodori_enabled');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });
  const [irodoriServerUrl, setIrodoriServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('irodori_server_url');
      if (
        stored &&
        stored !== 'http://localhost:8000/v1' &&
        stored !== 'http://localhost:8080/v1'
      ) {
        return stored;
      }
    }
    return 'builtin://irodori-engine';
  });
  const [irodoriApiKey, setIrodoriApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('irodori_api_key') || '';
    }
    return '';
  });
  const [irodoriStyleEmoji, setIrodoriStyleEmoji] = useState<string>('😏');
  const [irodoriPromptAudioBase64, setIrodoriPromptAudioBase64] = useState<string | null>(null);
  const [irodoriPromptAudioName, setIrodoriPromptAudioName] = useState<string | null>('S_6_minato.wav (登録済み)');
  const [isIrodoriModalOpen, setIsIrodoriModalOpen] = useState(false);
  const [isTestingIrodori, setIsTestingIrodori] = useState(false);
  const [irodoriTestResult, setIrodoriTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- ⏱️ API Quota & Cooldown Tracker State ---
  const [cooldownStatus, setCooldownStatus] = useState<{
    ttsCooldownActive: boolean;
    ttsCooldownRemainingSec: number;
    imageCooldownActive: boolean;
    imageCooldownRemainingSec: number;
    defaultCooldownDurationSec: number;
  } | null>(null);
  const [isResettingCooldown, setIsResettingCooldown] = useState(false);

  const fetchCooldownStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/cooldown');
      if (res.ok) {
        const data = await res.json();
        setCooldownStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleResetCooldown = async () => {
    setIsResettingCooldown(true);
    try {
      const res = await fetch('/api/system/cooldown/reset', { method: 'POST' });
      if (res.ok) {
        await fetchCooldownStatus();
      }
    } catch (e) {
      console.warn("Failed to reset cooldown:", e);
    } finally {
      setIsResettingCooldown(false);
    }
  };

  useEffect(() => {
    fetchCooldownStatus();
    const interval = setInterval(fetchCooldownStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchCooldownStatus]);

  // ④ 番組フォーマットを選択する（12星座の共鳴ランキング、聞かないと損する開運アクション、運命の救済解析データ）
  const [fortuneFormat, setFortuneFormat] = useState<'resonance_ranking' | 'fortune_actions' | 'destiny_salvation'>('resonance_ranking');
  const [fortuneIncludeCaller, setFortuneIncludeCaller] = useState(true);
  const [fortuneDuration, setFortuneDuration] = useState('full');
  const [fortuneCustomTopic, setFortuneCustomTopic] = useState('');
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [selectedConsultationMeta, setSelectedConsultationMeta] = useState<{ category: string; radioName: string } | null>(null);
  const [isGeneratingConsultation, setIsGeneratingConsultation] = useState(false);

  const TRENDING_CONSULTATION_PRESETS = [
    {
      id: 'ai_career',
      tagJa: '#AI時代・仕事と副業',
      tagEn: '#AI & Career',
      categoryJa: 'AI時代のキャリア・副業と転職の決断',
      categoryEn: 'AI Era Career & Side-Hustle Crossroads',
      radioNameJa: '迷える白兎（32歳・IT企業勤務）',
      radioNameEn: 'Wandering White Rabbit (32, Tech Worker)',
      questionJa: '職場にAIツールが急速に導入され、自分の仕事が3年後にあるのか不安で夜も眠れません。今から副業や新しいスキル習得に踏み出すべきか、それとも今の会社にしがみつくべきか、数霊の導きで決断のタイミングを教えてください。',
      questionEn: 'AI tools are rapidly transforming my workplace, and I lose sleep worrying if my job will exist in 3 years. Should I leap into a side business and new skills now, or hold onto my current role? Please guide my timing through sacred numbers.'
    },
    {
      id: 'wealth_nisa',
      tagJa: '#物価高・新NISA・金運',
      tagEn: '#Investing & Wealth',
      categoryJa: '物価高・新NISA・お金の不安と金運の波',
      categoryEn: 'Inflation, Investing & Wealth Resonance',
      radioNameJa: '黄金の羅針盤（38歳・会社員）',
      radioNameEn: 'Golden Compass (38, Office Worker)',
      questionJa: '物価高や相場の乱高下のニュースを見るたびにお金の不安が募り、新NISAの積立や自己投資をこのまま続けていいのか迷っています。お金の恐怖から解放され、本当の金運共鳴を引き寄せるにはどうすればいいでしょうか？',
      questionEn: 'Every time I see news about inflation and market swings, financial anxiety grips me and I doubt my investments. How can I break free from money fear and attract true wealth resonance?'
    },
    {
      id: 'sns_detox',
      tagJa: '#SNS疲れ・人間関係リセット',
      tagEn: '#SNS Detox & Ties',
      categoryJa: 'SNS疲れ・人間関係のリセットと自己肯定感',
      categoryEn: 'Social Media Fatigue & Relationship Detox',
      radioNameJa: '月夜のクラゲ（27歳・Webデザイナー）',
      radioNameEn: 'Moonlit Jellyfish (27, Web Designer)',
      questionJa: 'SNSを開けば同世代のキラキラした結婚や成功報告ばかりが目に入り、比べては落ち込んでしまいます。リアルな人間関係でも気を使いすぎて心がすり減っています。不要な縁を手放して自分の波長を取り戻す方法を教えてください。',
      questionEn: 'Whenever I open social media, everyone seems happier and more successful, leaving me drained. Even offline, I people-please until I am exhausted. How do I sever draining ties and reclaim my own frequency?'
    },
    {
      id: 'twinray_love',
      tagJa: '#復縁・ツインレイの真実',
      tagEn: '#Twin Flame & Love',
      categoryJa: '復縁・音信不通の相手とツインレイの真実',
      categoryEn: 'Twin Flame, Silence & Unfinished Love',
      radioNameJa: '深海のカナリア（29歳・医療職）',
      radioNameEn: 'Deep Sea Canary (29, Healthcare)',
      questionJa: '半年前に距離を置いた忘れられない人がいます。最近になって急にその人の夢を何度も見たり、誕生日の数字を街中で頻繁に見かけるようになりました。これは魂の共鳴（ツインレイ）のサインでしょうか？連絡すべきか手放すべきか迷っています。',
      questionEn: 'There is someone I parted ways with six months ago whom I cannot forget. Lately I keep dreaming of them and seeing their birthday numbers everywhere. Is this a Twin Flame resonance sign? Should I reach out or let go?'
    },
    {
      id: 'workplace_vampire',
      tagJa: '#職場のマウント・邪気払い',
      tagEn: '#Energy Vampires',
      categoryJa: '職場のマウント・エネルギーバンパイア対策',
      categoryEn: 'Workplace Energy Vampires & Protection',
      radioNameJa: '琥珀の祈り（35歳・事務職）',
      radioNameEn: 'Amber Prayer (35, Office Admin)',
      questionJa: '職場にいつも不機嫌で、人のミスを責めたりマウントを取ってくる先輩がいて、毎日エネルギーを吸い取られています。相手の負の波長に巻き込まれず、自分の運気とメンタルを守る数霊の結界はありますか？',
      questionEn: 'A toxic coworker constantly criticizes others and drains the entire room\'s energy. Is there a sacred numerological shield to protect my mental peace and luck from their negative vibration?'
    },
    {
      id: 'life_turning_point',
      tagJa: '#30代40代の転機・独立',
      tagEn: '#Life Crossroads',
      categoryJa: '30代・40代の人生の転機・独立か安定か',
      categoryEn: 'Life Crossroads: Independence vs. Stability',
      radioNameJa: '夜明けの旅人（41歳・管理職）',
      radioNameEn: 'Dawn Traveler (41, Manager)',
      questionJa: '長年勤めた会社で安定した立場にいますが、ずっと夢だった自分のサロン・事業を立ち上げたい気持ちと、収入が減る恐怖の間で揺れています。人生後半戦に向けて、今、運命の舵を切るべきでしょうか？',
      questionEn: 'I have a stable management role, yet I ache to launch my own dream business. Torn between passion and financial fear, should I turn the wheel of destiny now?'
    },
    {
      id: 'sleep_purification',
      tagJa: '#睡眠の質・魂の浄化',
      tagEn: '#Sleep & Cleansing',
      categoryJa: '原因不明のモヤモヤ・睡眠の質と魂の浄化',
      categoryEn: 'Unexplained Restlessness, Sleep & Soul Cleansing',
      radioNameJa: '星屑の羊（31歳・フリーランス）',
      radioNameEn: 'Stardust Sheep (31, Freelancer)',
      questionJa: '最近、特別なトラブルがあるわけではないのに夜中に何度も目が覚めたり、胸の奥がザワザワして集中できません。運気の切り替わりの前兆なのでしょうか？魂を浄化して深い眠りと幸運を取り戻すルーティンを知りたいです。',
      questionEn: 'Lately I wake up repeatedly in the middle of the night with an unexplained restlessness in my chest. Is this a sign of shifting luck? Please teach me a ritual to purify my soul and restore deep sleep.'
    },
    {
      id: 'self_investment',
      tagJa: '#推し活・自己投資と貯蓄',
      tagEn: '#Passions & Savings',
      categoryJa: '推し活・美容・自己投資と将来への貯蓄バランス',
      categoryEn: 'Passions, Self-Care & Future Financial Balance',
      radioNameJa: '紫水晶の蝶（26歳・アパレル職）',
      radioNameEn: 'Amethyst Butterfly (26, Fashion Retail)',
      questionJa: '推し活や美容・旅行など『今ときめくこと』にお金を使っている時は最高に幸せなのですが、ふと将来の貯蓄や結婚のことを考えると急に不安になります。幸福の共鳴を逃さないお金とエネルギーの使い方を教えてください。',
      questionEn: 'Spending on my passions, beauty, and travel makes me feel alive, yet sudden anxiety about future savings hits me. How do I balance joyful living with future security?'
    }
  ];

  const handleSelectRandomConsultation = (presetId?: string) => {
    setFortuneIncludeCaller(true);
    const isEn = fortuneLanguage === 'en';
    let picked = presetId
      ? TRENDING_CONSULTATION_PRESETS.find(p => p.id === presetId)
      : undefined;
    if (!picked) {
      const candidates = TRENDING_CONSULTATION_PRESETS.filter(p => p.id !== selectedConsultationId);
      picked = candidates[Math.floor(Math.random() * candidates.length)] || TRENDING_CONSULTATION_PRESETS[0];
    }
    const category = isEn ? picked.categoryEn : picked.categoryJa;
    const radioName = isEn ? picked.radioNameEn : picked.radioNameJa;
    const question = isEn ? picked.questionEn : picked.questionJa;
    const formatted = isEn
      ? `【Theme: ${category}】From ${radioName}: "${question}"`
      : `【相談テーマ：${category}】ラジオネーム：${radioName}「${question}」`;
    setSelectedConsultationId(picked.id);
    setSelectedConsultationMeta({ category, radioName });
    setFortuneCustomTopic(formatted);
  };

  const handleGenerateAIConsultation = async () => {
    setFortuneIncludeCaller(true);
    setIsGeneratingConsultation(true);
    try {
      const res = await fetch('/api/fortune/generate-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: fortuneLanguage,
          excludeId: selectedConsultationId,
          useAI: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.consultation) {
          setSelectedConsultationId(data.consultation.id);
          setSelectedConsultationMeta({
            category: data.consultation.category,
            radioName: data.consultation.radioName
          });
          setFortuneCustomTopic(data.consultation.formattedTopic);
          return;
        }
      }
      handleSelectRandomConsultation();
    } catch {
      handleSelectRandomConsultation();
    } finally {
      setIsGeneratingConsultation(false);
    }
  };

  // ラジオ or 動画 or 台本のみ の選択モード（Radio vs Video vs Script Mode）
  const [mediaMode, setMediaMode] = useState<'radio' | 'video' | 'script'>('radio');
  const [copiedScriptMode, setCopiedScriptMode] = useState<'dialogue' | 'timecode' | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoStyle, setVideoStyle] = useState<'breaking_news' | 'golden_mandala' | 'cyber_neon'>('breaking_news');
  const [isVideoExportModalOpen, setIsVideoExportModalOpen] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetDuration, setTargetDuration] = useState('3');
  const [targetMood, setTargetMood] = useState('Informative');
  const [selectedCategory, setSelectedCategory] = useState<'tech' | 'culture' | 'news'>('tech');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const [generationLogs, setGenerationLogs] = useState<Array<{
    id: string;
    timestamp: string;
    type: 'info' | 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'error';
    content?: string;
    name?: string;
    args?: any;
    result?: string;
  }>>([]);

  const [generationComplete, setGenerationComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState('Initializing...');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [hasQuotaError, setHasQuotaError] = useState(false);

  // --- RATE LIMITER & QUOTA STATES ---
  const DAILY_LIMIT = 3;

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [quota, setQuota] = useState<{
    allowed: boolean;
    limit: number;
    remaining: number;
    used: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Error signing in with Google:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const refreshQuota = async () => {
    try {
      const headers: Record<string, string> = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (tokenErr) {
          console.error("Error retrieving ID token:", tokenErr);
        }
      }
      const res = await fetch("/api/quota", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const used = typeof data.used === 'number' ? data.used : 0;
      const limit = typeof data.limit === 'number' ? data.limit : 3;
      setQuota({
        allowed: used < limit,
        limit: limit,
        remaining: Math.max(0, limit - used),
        used
      });
    } catch (err) {
      console.error("Error loading secure session quota:", err);
      setQuota({
        allowed: true,
        limit: DAILY_LIMIT,
        remaining: DAILY_LIMIT,
        used: 0
      });
    }
  };

  useEffect(() => {
    refreshQuota();
  }, [currentUser]);

  useEffect(() => {
    let interval: any;
    if (isGenerating && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, startTime]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const scrubText = (text: string) => {
    if (!text) return text;
    // Scrub GEMINI_API_KEY=... and "GEMINI_API_KEY": "..." and raw API keys
    return text
      .replace(/(GEMINI_API_KEY\s*(?:=|:)\s*)[^\s"'\\]+/g, '$1***')
      .replace(/("GEMINI_API_KEY"\s*:\s*")[^"]+"/g, '$1***"')
      .replace(/AIza[a-zA-Z0-9_-]{35}/g, '***')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  };

  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 p-3 rounded-lg text-white/70 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] border border-white/5 my-2">$1</pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-io-blue font-mono text-[10px]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const humanizeToolName = (name: string) => {
    const map: Record<string, string> = {
      'read_file': 'Read file',
      'list_files': 'List files',
      'bash': 'Run command',
      'google_search': 'Google search',
      'code_execution_call': 'Run command',
    };
    return map[name] || name;
  };

  const formatToolResult = (name: string | undefined, rawResult: string | undefined) => {
    if (!rawResult) return null;

    const unwrap = (str: any): any => {
      let current = str;
      for (let i = 0; i < 5; i++) {
        if (typeof current === 'string') {
          const trimmed = current.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
            try {
              current = JSON.parse(trimmed);
            } catch (e) {
              // If it fails to parse but starts and ends with quotes, try stripping them and unescaping
              if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                try {
                  const unescaped = trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                  current = JSON.parse(unescaped);
                } catch (e2) {
                  break;
                }
              } else {
                break;
              }
            }
          } else {
            break;
          }
        } else {
          break;
        }
      }
      return current;
    };

    let data = unwrap(rawResult);
    if (data && typeof data === 'object' && 'result' in data) {
      const inner = unwrap(data.result);
      if (inner && typeof inner === 'object') {
        data = inner;
      } else if (typeof inner === 'string') {
        data = inner;
      }
    }

    if (name === 'list_files' && data && Array.isArray(data.files)) {
      return (
        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
          <div className="flex flex-col gap-1 py-1">
            {data.files.map((f: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-white/70 font-mono text-[10px]">
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    let textToShow = '';
    if (name === 'read_file' && data && typeof data.content === 'string') {
      textToShow = data.content;
    } else if (name === 'read_file' && data && typeof data.error === 'string') {
      textToShow = data.error;
    } else if (name === 'bash' && data) {
      if (typeof data.output === 'string') {
        textToShow = data.output;
      } else if (typeof data.error === 'string') {
        textToShow = data.error;
      } else if (typeof data === 'object') {
        textToShow = JSON.stringify(data, null, 2);
      } else {
        textToShow = String(data);
      }
    } else if (typeof data === 'object') {
      textToShow = JSON.stringify(data, null, 2);
    } else {
      textToShow = String(data);
    }

    textToShow = textToShow.replace(/\\n/g, '\n').replace(/\\"/g, '"');

    return (
      <pre className="bg-black/40 p-3 rounded-lg text-white/70 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] border border-white/5">
        {scrubText(textToShow)}
      </pre>
    );
  };

  const downloadLogs = () => {
    const logText = generationLogs.map(l => {
      let content = l.content || '';
      if (l.type === 'tool_call') content = `${l.name}(${JSON.stringify(l.args)})`;
      if (l.type === 'tool_result') content = `${l.name || 'result'}: ${l.result}`;
      return `[${l.timestamp}] [${l.type}] ${scrubText(content)}`;
    }).join('\\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${new Date().toISOString().replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const progress = currentTime / (selectedShow.duration || 1);

  // --- TTS LOCAL FALLBACK PLAYBACK ENGINE REFS & LOGIC ---
  const ttsIntervalRef = useRef<any>(null);
  const ttsCurrentSpeakerIndexRef = useRef<number>(-1);
  const ttsPlayingRef = useRef<boolean>(false);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const isTtsPlayMode = !selectedShow.audioUrl || selectedShow.audioUrl.includes('starter-apps');

  const getSegmentIndexAtTime = (time: number) => {
    return selectedShow.transcript?.findIndex(
      line => time >= line.start && time < line.end
    ) ?? -1;
  };

  const handlePlaySampleVoice = async (preset: VoicePreset) => {
    // Stop if currently playing this preset
    if (previewingVoiceId === preset.id) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPreviewingVoiceId(null);
      setSampleVoiceLoadingId(null);
      return;
    }

    // Stop any existing playback
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const textToSpeak = fortuneLanguage === 'en' ? preset.sampleEn : preset.sampleJa;
    setPreviewingVoiceId(preset.id);
    setSampleVoiceLoadingId(preset.id);

    let playedOnlineAudio = false;

    // Check if Irodori-TTS integration is active
    if (irodoriEnabled && irodoriServerUrl) {
      try {
        const irodoriRes = await fetch('/api/tts/irodori/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            serverUrl: irodoriServerUrl,
            apiKey: irodoriApiKey,
            promptAudioBase64: irodoriPromptAudioBase64,
            styleEmoji: irodoriStyleEmoji,
            voice: 'minato',
          })
        });
        if (irodoriRes.ok) {
          const irodoriData = await irodoriRes.json();
          if (irodoriData.audioUrl) {
            const audio = new Audio(irodoriData.audioUrl);
            sampleAudioRef.current = audio;
            audio.onended = () => {
              setPreviewingVoiceId(null);
              setSampleVoiceLoadingId(null);
            };
            audio.onerror = () => {
              setPreviewingVoiceId(null);
              setSampleVoiceLoadingId(null);
            };
            setSampleVoiceLoadingId(null);
            await audio.play();
            playedOnlineAudio = true;
          }
        }
      } catch (irodoriErr) {
        console.warn('Irodori-TTS preview failed, falling back:', irodoriErr);
      }
    }

    if (!playedOnlineAudio) {
      try {
        const res = await fetch('/api/fortune/sample-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voiceName: preset.geminiVoice,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            sampleAudioRef.current = audio;
            audio.onended = () => {
              setPreviewingVoiceId(null);
              setSampleVoiceLoadingId(null);
            };
            audio.onerror = () => {
              setPreviewingVoiceId(null);
              setSampleVoiceLoadingId(null);
            };
            setSampleVoiceLoadingId(null);
            await audio.play();
            playedOnlineAudio = true;
          }
        }
      } catch (e) {
        // Fallback to Web Speech API
      }
    }

    if (!playedOnlineAudio) {
      setSampleVoiceLoadingId(null);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const voices = window.speechSynthesis.getVoices() || [];

        if (fortuneLanguage === 'ja') {
          utterance.lang = 'ja-JP';
          const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang.includes('JP'));
          // Minato alluring tone matching the audio sample
          const alluringVoice = jaVoices.find(v => 
            v.name.includes('Nanami') || 
            v.name.includes('Kyoko') || 
            v.name.includes('Haruka') || 
            v.name.includes('Ayumi') || 
            v.name.toLowerCase().includes('female')
          ) || jaVoices[0];
          if (alluringVoice) utterance.voice = alluringVoice;
        } else {
          utterance.lang = 'en-US';
          const enVoices = voices.filter(v => v.lang.startsWith('en'));
          const enVoice = enVoices.find(v => 
            v.name.toLowerCase().includes('samantha') || 
            v.name.toLowerCase().includes('zira') || 
            v.name.toLowerCase().includes('female')
          ) || enVoices[0];
          if (enVoice) utterance.voice = enVoice;
        }

        utterance.pitch = preset.pitch;
        utterance.rate = preset.rate;

        const safetyTimer = setTimeout(() => {
          setPreviewingVoiceId(prev => (prev === preset.id ? null : prev));
        }, 12000);

        utterance.onend = () => {
          clearTimeout(safetyTimer);
          setPreviewingVoiceId(null);
        };
        utterance.onerror = () => {
          clearTimeout(safetyTimer);
          setPreviewingVoiceId(null);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        setPreviewingVoiceId(null);
      }
    }
  };

  const buildSegmentUtterance = (text: string, speaker: string, currentIndex: number): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (typeof window === 'undefined' || !window.speechSynthesis) return utterance;

    const voices = window.speechSynthesis.getVoices() || [];
    const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);

    // Identify if speaker is Host (Master Minato) or Caller/Guest
    const isCaller = speaker?.includes('仔羊') || 
                     speaker?.includes('リスナー') || 
                     speaker?.toLowerCase().includes('caller') || 
                     speaker?.toLowerCase().includes('listener');
    const isMinato = !isCaller;

    // Use selectedShow's bound voice preset or current active preset
    const activePreset = MINATO_VOICE_PRESETS.find(p => p.id === (selectedShow.voicePresetId || selectedVoicePresetId)) || MINATO_VOICE_PRESETS[0];

    if (isJapanese) {
      utterance.lang = 'ja-JP';
      const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang.includes('JP'));

      if (isMinato) {
        // Master Minato: Elegant, alluring, seductive female oracle tone matching the sample voice
        const minatoVoice = jaVoices.find(v => 
          v.name.includes('Nanami') || 
          v.name.includes('Kyoko') || 
          v.name.includes('Ayumi') || 
          v.name.includes('Haruka') ||
          v.name.includes('Sayaka') ||
          v.name.toLowerCase().includes('female')
        ) || jaVoices[0];

        if (minatoVoice) utterance.voice = minatoVoice;
        utterance.pitch = selectedShow.voicePitch ?? activePreset.pitch;
        utterance.rate = selectedShow.voiceRate ?? activePreset.rate;
      } else {
        // Caller / Listener Seeking Guidance
        const callerVoice = jaVoices.find(v => 
          v.name.includes('Otoya') || 
          v.name.includes('Keita') || 
          v.name.includes('Ichiro') || 
          v.name.toLowerCase().includes('male')
        ) || jaVoices[1] || jaVoices[0];

        if (callerVoice) utterance.voice = callerVoice;
        utterance.pitch = 1.05;
        utterance.rate = 1.0;
      }
    } else if (voices.length > 0) {
      utterance.lang = 'en-US';
      const enVoices = voices.filter(v => v.lang.startsWith('en'));

      if (isMinato) {
        // Master Minato (English): Alluring, authoritative mystic
        const minatoVoice = enVoices.find(v => 
          v.name.toLowerCase().includes('samantha') || 
          v.name.toLowerCase().includes('zira') || 
          v.name.toLowerCase().includes('victoria') ||
          v.name.toLowerCase().includes('female')
        ) || enVoices[0];

        if (minatoVoice) utterance.voice = minatoVoice;
        utterance.pitch = selectedShow.voicePitch ?? activePreset.pitch;
        utterance.rate = selectedShow.voiceRate ?? activePreset.rate;
      } else {
        // Caller
        const callerVoice = enVoices.find(v => 
          v.name.toLowerCase().includes('david') || 
          v.name.toLowerCase().includes('guy') || 
          v.name.toLowerCase().includes('male')
        ) || enVoices[1] || enVoices[0];

        if (callerVoice) utterance.voice = callerVoice;
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }
    }

    return utterance;
  };

  const playTtsSegment = (index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!ttsPlayingRef.current) return;
    if (!selectedShow.transcript || index >= selectedShow.transcript.length) {
      setIsPlaying(false);
      ttsPlayingRef.current = false;
      ttsCurrentSpeakerIndexRef.current = -1;
      return;
    }

    ttsCurrentSpeakerIndexRef.current = index;
    const segment = selectedShow.transcript[index];
    setCurrentTime(segment.start);

    window.speechSynthesis.cancel();
    const utterance = buildSegmentUtterance(segment.text, segment.speaker, index);

    // Track time smoothly during speech
    const startTime = Date.now();
    if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    ttsIntervalRef.current = setInterval(() => {
      if (!ttsPlayingRef.current || ttsCurrentSpeakerIndexRef.current !== index) {
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(Math.min(segment.end - 0.2, segment.start + elapsed));
    }, 250);

    utterance.onend = () => {
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      if (ttsPlayingRef.current && ttsCurrentSpeakerIndexRef.current === index) {
        // Naturally advance to the next turn after a gentle 350ms broadcast breath
        setTimeout(() => {
          if (ttsPlayingRef.current) {
            playTtsSegment(index + 1);
          }
        }, 350);
      }
    };

    utterance.onerror = (e) => {
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      console.warn("[TTS Speech Error]:", e);
      if (ttsPlayingRef.current && ttsCurrentSpeakerIndexRef.current === index) {
        setTimeout(() => {
          if (ttsPlayingRef.current) {
            playTtsSegment(index + 1);
          }
        }, 350);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakCurrentSegment = (time: number) => {
    const currentIndex = Math.max(0, getSegmentIndexAtTime(time));
    playTtsSegment(currentIndex);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const onVoices = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        window.speechSynthesis.cancel();
      };
    }
    return () => {
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // When selectedShow changes, reset currentTime and pause playback
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [selectedShow]);


  useEffect(() => {
    // Check sharing configuration
    fetch('/api/share/config')
      .then(res => res.json())
      .then(data => {
        setIsSharingEnabled(!!data.isSharingEnabled);
      })
      .catch(err => {
        console.error("Error fetching sharing config:", err);
        setIsSharingEnabled(false);
      });

    const loadData = async () => {
      let userShows: any[] = [];
      try {
        userShows = await getUserShows();
      } catch (e) {
        console.error("Failed to load user-generated shows from IndexedDB:", e);
      }

      const isShared = getQueryParam('share_id') || getQueryParam('share');

      fetch('/api/shows')
        .then(res => res.json())
        .then((shows: any[]) => {
          const transformedShows = (shows && shows.length > 0)
            ? shows.map(show => transformShow({
                ...show,
                coverImage: show.coverImage || "https://www.gstatic.com/aistudio/starter-apps/assets/ai_radio/cover.jpg"
              }))
            : [];

          // Merge: user shows + fetched public shows + baseline pre-generated shows
          const merged = [...userShows, ...transformedShows, MOCK_SHOW, MOCK_SHOW_2];
          const uniqueShows = merged.filter((show, index, self) =>
            index === self.findIndex((s) => s.title === show.title)
          );

          setLibrary(uniqueShows);
          if (!isShared && uniqueShows.length > 0) {
            setSelectedShow(uniqueShows[0]);
          }
        })
        .catch(err => {
          console.error("Error loading public shows, using local fallback shows:", err);
          const merged = [...userShows, MOCK_SHOW, MOCK_SHOW_2];
          const uniqueShows = merged.filter((show, index, self) =>
            index === self.findIndex((s) => s.title === show.title)
          );
          setLibrary(uniqueShows);
          if (!isShared && uniqueShows.length > 0) {
            setSelectedShow(uniqueShows[0]);
          }
        });
    };

    loadData();
  }, []);

  // --- PLAYBACK OF SHARED SHOW ON BOOT ---
  useEffect(() => {
    const shareId = getQueryParam('share_id') || getQueryParam('share');

    if (shareId) {
      console.log(`[Sharing] Found shareId: ${shareId}`);
      setIsSharedPlaybackMode(true);
      setSharedShowLoading(true);
      setView('player');

      fetch(`/api/shares/${shareId}`)
        .then(res => {
          if (!res.ok) throw new Error('Shared show not found on server');
          return res.json();
        })
        .then(data => {
          if (data && data.title) {
            setSelectedShow(data);
          } else {
            throw new Error('Invalid shared show data received');
          }
          setSharedShowLoading(false);
        })
        .catch(err => {
          console.error("Failed to load shared show:", err);
          setSharedShowError(err.message || "Failed to load the shared show");
          setSharedShowLoading(false);
        });
    }
  }, []);

  const getBlobFromUrl = async (url: string): Promise<Blob> => {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      return await res.blob();
    }
    const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin);
    const fetchUrl = isExternal
      ? `/api/download-proxy?url=${encodeURIComponent(url)}`
      : url;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Failed to fetch media file: ${res.statusText}`);
    return await res.blob();
  };

  const handleShare = async () => {
    if (!selectedShow) return;

    // Check if we already have a generated share ID/URL for this specific show to prevent duplicate uploads
    if (selectedShow.shareId) {
      const existingShareUrl = selectedShow.shareUrl || getPublishedShareLink(selectedShow.shareId);
      setIsShareModalOpen(true);
      setSharingInProgress(false);
      setUploadProgress(100);
      setUploadStatus('Retrieving existing shared radio show link...');
      setShareUrl(existingShareUrl);
      return;
    }

    setSharingInProgress(true);
    setIsShareModalOpen(true);
    setShareUrl(null);
    setSharingError(null);
    setCopySuccess(false);
    setUploadProgress(0);
    setUploadStatus('Preparing metadata...');

    try {
      // 1. Send metadata to server to retrieve signed upload/read URLs
      const metadata = {
        title: selectedShow.title,
        summary: selectedShow.summary || selectedShow.description || "",
        transcript: selectedShow.transcript || [],
        prompt: selectedShow.prompt || prompt || "",
        duration: selectedShow.duration,
        host: selectedShow.host || "",
        isBase64Encoded: selectedShow.isBase64Encoded || false,
        date: selectedShow.date || new Date().toLocaleDateString()
      };

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.shareId) {
        throw new Error("Invalid response received from sharing API (make sure GCS is configured on backend)");
      }

      const { shareId, uploadUrl, uploadCoverUrl, alreadyExists } = data;

      if (alreadyExists) {
        // Reuse GCS share URL directly without uploading audio/cover
        setUploadStatus('Retrieving existing shared files from GCS...');
        setUploadProgress(80);
        
        const generatedShareUrl = getPublishedShareLink(shareId);
        const updatedShow = { ...selectedShow, shareId, shareUrl: generatedShareUrl };
        setSelectedShow(updatedShow);
        setLibrary(prev => prev.map(s => s.title === selectedShow.title ? updatedShow : s));

        if (selectedShow.isUserGenerated) {
          try {
            await saveUserShow(updatedShow);
          } catch (e) {
            console.error("Failed to save shared show metadata into IndexedDB:", e);
          }
        }

        setUploadProgress(100);
        setUploadStatus('Retrieved existing share link from GCS!');
        setShareUrl(generatedShareUrl);
        return;
      }

      if (!uploadUrl || !uploadCoverUrl) {
        throw new Error("Missing upload URLs in sharing API response");
      }

      // 2. Load the actual audio file/blob
      setUploadStatus('Fetching radio show audio stream...');
      setUploadProgress(5);
      const audioBlob = await getBlobFromUrl(selectedShow.audioUrl);

      // 3. Upload the MP3 with progress bar
      setUploadStatus('Uploading stereo audio stream to GCS...');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', 'audio/mpeg');
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Map audio progress to 10% - 80%
            const percent = Math.round((e.loaded / e.total) * 70) + 10;
            setUploadProgress(percent);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Audio upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Audio upload failed due to network error'));
        xhr.send(audioBlob);
      });

      // 4. Load the cover image
      setUploadStatus('Uploading high-res cover art canvas to GCS...');
      setUploadProgress(82);

      let coverBlob: Blob | null = null;
      if (selectedShow.coverImage) {
        try {
          coverBlob = await getBlobFromUrl(selectedShow.coverImage);
        } catch (err) {
          console.warn("Could not retrieve text-to-image cover art canvas blob, using fallback...", err);
        }
      }

      if (coverBlob) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadCoverUrl, true);
          xhr.setRequestHeader('Content-Type', 'image/png');
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              // Map cover progress to 82% - 98%
              const percent = Math.round((e.loaded / e.total) * 16) + 82;
              setUploadProgress(percent);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Cover upload failed with status ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Cover upload failed due to network error'));
          xhr.send(coverBlob);
        });
      }

      // 5. Complete and update state
      const generatedShareUrl = getPublishedShareLink(shareId);
      const updatedShow = { ...selectedShow, shareId, shareUrl: generatedShareUrl };
      setSelectedShow(updatedShow);
      setLibrary(prev => prev.map(s => s.title === selectedShow.title ? updatedShow : s));

      if (selectedShow.isUserGenerated) {
        try {
          await saveUserShow(updatedShow);
        } catch (e) {
          console.error("Failed to save shared show metadata into IndexedDB:", e);
        }
      }

      setUploadProgress(100);
      setUploadStatus('Share creation successfully completed!');
      setShareUrl(generatedShareUrl);
    } catch (err: any) {
      console.error("Error creating viral share:", err);
      const errMsg = err.message || "Failed to package or upload files";
      setUploadStatus(`Error: ${errMsg}`);
      setSharingError(errMsg);
      setUploadProgress(0);
    } finally {
      setSharingInProgress(false);
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => console.error("Could not copy:", err));
    }
  };

  const exitSharedPlayback = () => {
    setIsSharedPlaybackMode(false);
    setSharedShowError(null);
    window.history.replaceState({}, '', window.location.pathname);
    setView('home');
  };

  const remixSharedShow = () => {
    if (selectedShow && selectedShow.prompt) {
      setPrompt(selectedShow.prompt);
    }
    setIsSharedPlaybackMode(false);
    setSharedShowError(null);
    window.history.replaceState({}, '', window.location.pathname);
    setView('home');
  };

  const togglePlay = () => {
    if (isTtsPlayMode) {
      if (isPlaying) {
        ttsPlayingRef.current = false;
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsPlaying(false);
      } else {
        ttsPlayingRef.current = true;
        setIsPlaying(true);
        const startIndex = Math.max(0, getSegmentIndexAtTime(currentTime));
        playTtsSegment(startIndex);
      }
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent, show: any) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Helper to fetch/convert any URL or data URI to a Blob
      const getFileContent = async (url: string): Promise<Blob> => {
        if (url.startsWith('data:')) {
          const res = await fetch(url);
          return await res.blob();
        }
        const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin);
        const fetchUrl = isExternal
          ? `/api/download-proxy?url=${encodeURIComponent(url)}`
          : url;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Failed to fetch URL: ${url}`);
        return await res.blob();
      };

      // Helper to convert seconds into "MM:SS"
      const formatTimecode = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      // Add audio file to ZIP in memory
      if (show.audioUrl) {
        try {
          const audioBlob = await getFileContent(show.audioUrl);
          zip.file("ai_radio.mp3", audioBlob);
        } catch (err) {
          console.error("Failed to include audio in zip:", err);
        }
      }

      // Add cover image to ZIP in memory
      if (show.coverImage) {
        try {
          const imgBlob = await getFileContent(show.coverImage);
          zip.file("cover.png", imgBlob);
        } catch (err) {
          console.error("Failed to include cover in zip:", err);
        }
      }

      // Reconstruct show_notes.json format
      const showNotesJson = {
        show_title: show.title,
        show_duration: formatTimecode(show.duration),
        two_sentence_summary: show.summary,
        date_of_generation: show.date,
        timecoded_transcript: show.transcript ? show.transcript.map((line: any) => ({
          timecode: formatTimecode(line.start),
          speaker: line.speaker,
          text: line.text
        })) : []
      };

      zip.file("show_notes.json", JSON.stringify(showNotesJson, null, 2));

      // Generate the zip on the client side
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-show.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('In-browser ZIP creation failed, falling back to individual download:', err);
      
      const downloadFile = (url: string, defaultName: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      if (show.audioUrl) downloadFile(show.audioUrl, 'ai_radio.mp3');
      if (show.coverImage) downloadFile(show.coverImage, 'cover.png');
    }
  };

  const onTimeUpdate = () => {
    if (!isTtsPlayMode && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const seek = (time: number) => {
    if (isTtsPlayMode) {
      setCurrentTime(time);
      if (isPlaying) {
        ttsPlayingRef.current = true;
        const targetIndex = Math.max(0, getSegmentIndexAtTime(time));
        playTtsSegment(targetIndex);
      } else {
        ttsPlayingRef.current = false;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        ttsCurrentSpeakerIndexRef.current = -1;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
        if (!isPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const stepTime = (amount: number) => {
    const newTime = Math.max(0, Math.min(selectedShow.duration, currentTime + amount));
    seek(newTime);
  };

  const fortuneFormatTitles: Record<string, { ja: string; en: string }> = {
    resonance_ranking: {
      ja: '12星座の共鳴ランキング',
      en: '12 Zodiac Resonance Ranking'
    },
    fortune_actions: {
      ja: '聞かないと損する開運アクション',
      en: 'Must-Listen Fortune Actions'
    },
    destiny_salvation: {
      ja: '運命の救済解析データ',
      en: 'Destiny Salvation Analysis Data'
    }
  };

  const handleInsertSampleFortune = () => {
    if (fortuneLanguage === 'en') {
      const sampleEn = `# 【Sacred Numerology & 12 Zodiac Cosmic Resonance】 October 11, 2026
■ Cosmic Frequency of the Day: 【Frequency 9・Awakening of Full Potential】
Today is governed by sacred number 9—a day of divine clarity, spiritual synthesis, and breakthrough momentum.
"Trust your intuitive compass and draw strength from the sacred vibration of 8."

■ 12 Zodiac Resonance Ranking
【Rank 1】 Aries
・Resonance Score: 99 / Sacred Number: 8 (Infinite Materialization)
・Destiny Analysis: Mars aligns with the supreme vibration of 8. Decisive career moves and new project proposals bring tremendous fruit.
・Must-Listen Fortune Action: Draw the number '8' on your palm with a silver pen.
・Lucky Items: Silver ballpoint pen, Dark roast coffee

【Rank 2】 Leo
・Resonance Score: 95 / Sacred Number: 1
・Destiny Analysis: Natural charisma and bold articulation inspire peers. Radiate confidence with a warm smile.

【Rank 3】 Sagittarius
・Resonance Score: 92 / Sacred Number: 5
・Destiny Analysis: Curiosity and expansion unlock unexpected doors. Ideal time to reach out to international peers.

【Ranks 4 to 11】
・Taurus (4): Diligent persistence builds enduring trust. Enjoy warm chamomile tea at lunch.
・Gemini (3): Fluid dialogue sparks profitable partnerships.
・Cancer (2): Expressing gratitude to loved ones magnetizes good fortune.
・Virgo (6): Precise eye for detail is praised. Keep a steady pace.
・Libra (7): Aesthetic discernment shines. Wear one accent accessory.
・Scorpio (9): Intuition peaks in the evening. Trust your inner knowing.
・Capricorn (4): Recognition for leadership and dependability is approaching.
・Aquarius (11): Revolutionary visions take root. Keep a note of sudden insights.

【Rank 12・Salvation Target】 Pisces
・Resonance Score: 68 / Sacred Number: 7
・Salvation Protocol: Guard against emotional overload. Take a warm bath with mineral salts tonight.

■ Must-Listen Daily Action
"Before noon, face East, take 3 deep revitalizing breaths, and declutter one unused note or receipt."`;
      setFortuneInputText(sampleEn);
    } else {
      const sampleJa = `# 【数霊＆12星座 運命共鳴データ】2026年10月11日
■ 本日の宇宙数霊波動：【第9波長・大成の共鳴】
本日は数霊「9」が支配する霊的覚醒の日。過去の滞りが解消され、新しい次元へとステップアップする転機を迎えます。
「直感を信じて数字の8を意識すること」が最大の運命好転キー！

■ 12星座共鳴ランキング
【第1位】おひつじ座（牡羊座）
・共鳴スコア：99点（完全共鳴）
・数霊ナンバー：8（無限実り）
・運命解析：火星の情熱と数霊8が強力合致。ビジネスの新規提案や大きな決断は大吉。
・開運アクション：シルバーのペンで手のひらに「8」を一度描く
・ラッキーアイテム：シルバーのボールペン、深煎りコーヒー

【第2位】しし座（獅子座）
・共鳴スコア：95点 / 数霊ナンバー：1
・運命解析：リーダーシップと自発的な発言が周囲を感銘させます。笑顔を意識。

【第3位】いて座（射手座）
・共鳴スコア：92点 / 数霊ナンバー：5
・運命解析：未知への冒険が吉。新しいスキルの学習や遠方への連絡に大吉。

【第4位〜第11位】
・おうし座（4）：地道な努力が大きな信頼へ。温かいお茶でリラックス。
・ふたご座（3）：軽やかな対話にチャンス。情報交換を積極的に。
・かに座（2）：大切な人への素直な感謝が良縁を引き寄せます。
・おとめ座（6）：細部の気配りが高評価。焦らず一歩ずつ。
・てんびん座（7）：美的センスが光る日。身だしなみのワンポイントにこだわりを。
・さそり座（9）：夕刻以降に直観が冴え渡る。決断は自分軸で。
・やぎ座（4）：責任ある役割に抜擢の予兆。自信を持って受諾を。
・みずがめ座（11）：ひらめきが未来の種に。直感メモを忘れずに。

【第12位・救済解析対象】うお座（魚座）
・共鳴スコア：68点 / 数霊ナンバー：7
・救済解析：周囲のネガティブな感情を吸収しやすい日。夜は東を向いて深呼吸し、塩風呂で浄化を。

■ 本日の聞かないと損する開運アクション
「午前中に東の方角を向いて深呼吸を3回し、デスク周りの不要な紙を1枚破棄すること」`;
      setFortuneInputText(sampleJa);
    }
  };

  const handleAutoGenerateFortuneData = async () => {
    setIsGeneratingFortuneData(true);
    try {
      const res = await fetch('/api/fortune/generate-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: fortuneDate,
          customFocus: fortuneFocus
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success && result.data) {
        setGeneratedFortunePreview(result.data);
        if (result.data.formattedMarkdown) {
          setFortuneInputText(result.data.formattedMarkdown);
        }
      }
    } catch (err) {
      console.error("Failed to generate fortune data:", err);
    } finally {
      setIsGeneratingFortuneData(false);
    }
  };

  const handleGenerateFortuneShow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auth.currentUser && !IS_DEV) {
      await handleSignIn();
      return;
    }

    if (quota && quota.remaining <= 0 && !IS_DEV) {
      return;
    }

    const dataToUse = fortuneInputText.trim();
    if (!dataToUse && fortuneTab === 'paste') {
      handleInsertSampleFortune();
      return;
    }

    const activePreset = MINATO_VOICE_PRESETS.find(p => p.id === selectedVoicePresetId) || MINATO_VOICE_PRESETS[0];
    const hostDisplayName = fortuneLanguage === 'en' ? 'Master Minato' : '数霊師ミナト';
    const currentFormatName = fortuneFormatTitles[fortuneFormat]?.[fortuneLanguage] || fortuneFormat;

    setIsGenerating(true);
    setView('generating');
    setGenerationLogs([]);
    setHasQuotaError(false);

    setStartTime(Date.now());
    setElapsedTime(0);
    setGenerationComplete(false);
    setCurrentStage(fortuneLanguage === 'en' ? 'Analyzing Sacred Numerology data...' : '数霊・星読みデータを解析中...');
    const mediaTitlePrefix = mediaMode === 'video' ? '🎬 特報動画' : mediaMode === 'script' ? '📝 台本' : '📻 ラジオ';
    const durationLabel = fortuneDuration === 'full' 
      ? (fortuneLanguage === 'en' ? 'Full Text Coverage' : 'テキスト全文網羅') 
      : `${fortuneDuration}${fortuneLanguage === 'en' ? ' min' : '分'}`;
    setActivePrompt(`【${hostDisplayName}】${mediaTitlePrefix}・${currentFormatName} (${durationLabel})`);

    let generatedShow: any = null;
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/fortune/generate-radio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fortuneData: dataToUse || (fortuneLanguage === 'en' ? "Today's cosmic numerology and 12 zodiac guidance" : "GeminiSparkによる本日の12星座運勢総合データ"),
          language: fortuneLanguage,
          format: fortuneFormat,
          hostName: hostDisplayName,
          geminiVoice: activePreset.geminiVoice,
          voicePresetId: activePreset.id,
          voicePresetName: activePreset.name,
          voicePresetDesc: activePreset.desc,
          voiceSampleText: fortuneLanguage === 'en' ? activePreset.sampleEn : activePreset.sampleJa,
          voicePitch: activePreset.pitch,
          voiceRate: activePreset.rate,
          duration: fortuneDuration,
          includeCaller: fortuneIncludeCaller,
          customTopic: fortuneCustomTopic,
          mediaMode,
          videoAspectRatio,
          videoStyle,
          irodoriConfig: irodoriEnabled ? {
            enabled: true,
            serverUrl: irodoriServerUrl,
            apiKey: irodoriApiKey,
            promptAudioBase64: irodoriPromptAudioBase64,
            styleEmoji: irodoriStyleEmoji,
            voice: 'minato',
          } : null,
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decodedChunk = decoder.decode(value, { stream: true });
        buffer += decodedChunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") continue;

          try {
            const event = JSON.parse(dataStr);
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

            if (event.type === "info" || event.type === "error") {
              if (event.message?.includes('解析')) setCurrentStage('占いデータを解析中...');
              if (event.message?.includes('台本')) setCurrentStage('星読みラジオ台本を執筆中...');
              if (event.message?.includes('写真') || event.message?.includes('音声')) setCurrentStage('番組ジャケット＆音声を合成中...');
              setGenerationLogs(prev => [...prev, {
                id: Math.random().toString(), timestamp, type: event.type, content: event.message
              }]);
            } else if (event.type === "thinking" || event.type === "text") {
              setGenerationLogs(prev => [...prev, {
                id: Math.random().toString(), timestamp, type: event.type, content: event.text
              }]);
            } else if (event.type === "tool_call") {
              if (event.name === 'generate_script') setCurrentStage('星読みラジオ台本を執筆中...');
              if (event.name === 'generate_media') setCurrentStage('番組ジャケット＆音声を合成中...');
              setGenerationLogs(prev => [...prev, {
                id: Math.random().toString(), timestamp, type: 'tool_call', name: event.name, args: event.arguments
              }]);
            } else if (event.type === "tool_result") {
              setGenerationLogs(prev => [...prev, {
                id: Math.random().toString(), timestamp, type: 'tool_result', name: event.name, result: event.result
              }]);
            } else if (event.type === "show_data" && event.data) {
              generatedShow = transformShow({
                ...event.data,
                coverImage: event.data.coverImage
              });
            }
          } catch (e) {
            console.error("Error parsing event:", e, dataStr);
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (generatedShow) {
        const userShow = { 
          ...generatedShow, 
          isUserGenerated: true,
          mediaMode: mediaMode,
          videoAspectRatio: videoAspectRatio,
          videoStyle: videoStyle,
          voicePresetId: activePreset.id,
          voicePresetName: activePreset.name,
          voicePresetDesc: activePreset.desc,
          voiceSampleText: fortuneLanguage === 'en' ? activePreset.sampleEn : activePreset.sampleJa,
          voicePitch: activePreset.pitch,
          voiceRate: activePreset.rate,
          geminiVoice: activePreset.geminiVoice,
          voiceSampleUrl: generatedShow.voiceSampleUrl || '',
        };
        try {
          await saveUserShow(userShow, currentUser?.uid);
        } catch (e) {
          console.error("Error saving new show:", e);
        }
        setSelectedShow(userShow);
        setLibrary(prev => [userShow, ...prev]);
        setGenerationComplete(true);
        refreshQuota();
        if (mediaMode === 'script') {
          setView('player');
          setGenerationComplete(false);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Generation aborted");
      } else {
        console.error("Failed to generate fortune show:", error);
        setGenerationLogs(prev => [...prev, {
          id: Math.random().toString(),
          timestamp: new Date().toISOString().split('T')[1].split('.')[0],
          type: 'error',
          content: error.message || "番組の生成中にエラーが発生しました。"
        }]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent, overridePrompt?: string, overrideDuration?: string, overrideMood?: string) => {
    if (e) e.preventDefault();
    if (!auth.currentUser && !IS_DEV) {
      await handleSignIn();
      return;
    }
    const p = overridePrompt ?? prompt;
    const d = overrideDuration ?? targetDuration;
    const m = overrideMood ?? targetMood;
    if (!p.trim()) return;

    if (quota && quota.remaining <= 0 && !IS_DEV) {
      return;
    }

    setActivePrompt(p);
    if (overridePrompt) setPrompt(overridePrompt);
    if (overrideDuration) setTargetDuration(overrideDuration);
    if (overrideMood) setTargetMood(overrideMood);

    setIsGenerating(true);
    setView('generating');
    setGenerationLogs([]);
    setHasQuotaError(false);

    setStartTime(Date.now());
    setElapsedTime(0);
    setGenerationComplete(false);
    setCurrentStage('Initializing...');

    let generatedShow: typeof MOCK_SHOW | null = null;

    abortControllerRef.current = new AbortController();
    const generationId = Math.random().toString(36).substring(2, 15);
    generationIdRef.current = generationId;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (tokenErr) {
          console.error("Error retrieving ID token:", tokenErr);
        }
      }

      console.log("[Client] Sending POST request to /api/generate-show with payload:", {
        topic: p,
        duration: d,
        mood: m,
        generationId
      });

      const response = await fetch('/api/generate-show', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: p,
          duration: d,
          mood: m,
          generationId
        }),
        signal: abortControllerRef.current.signal
      });

      console.log("[Client] Server response received. Status code:", response.status, "Status Text:", response.statusText);

      if (response.status === 429) {
        const errData = await response.json().catch(() => ({}));
        console.warn("[Client] Received 429 too many requests. Payload:", errData);
        setIsGenerating(false);
        setView('home');
        setGenerationLogs(prev => [...prev, {
          id: Math.random().toString(),
          timestamp: new Date().toISOString().split('T')[1].split('.')[0],
          type: 'error',
          content: errData.error || "Generation limit exceeded. Please try again tomorrow."
        }]);
        refreshQuota();
        return;
      }

      if (!response.ok) {
        console.error("[Client] Non-2xx response. Throwing error.");
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error("[Client] Response is ok but body reader is null.");
        throw new Error("No response body");
      }
      console.log("[Client] ReadableStream reader acquired successfully. Entering chunk consumption loop...");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[Client] ReadableStream reader reported done=true.");
          break;
        }

        const decodedChunk = decoder.decode(value, { stream: true });
        console.log(`[Client] Chunk received: ${value.length} bytes. Decoded text:`, decodedChunk);
        
        buffer += decodedChunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          console.log("[Client] Raw line in buffer:", line);
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            console.log("[Client] Processed [DONE] signal.");
            continue;
          }

          try {
            const event = JSON.parse(dataStr);
            console.info("[Client] Parsed event payload:", event);
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

            if (event.type === "info" || event.type === "error") {
               if (event.message?.includes('Downloading')) setCurrentStage('Extracting final files...');
               if (event.type === "error" && (
                 event.message?.toLowerCase().includes("quota") || 
                 event.message?.toLowerCase().includes("too_many_requests") || 
                 event.message?.toLowerCase().includes("resource_exhausted") ||
                 event.message?.toLowerCase().includes("limit")
               )) {
                 console.warn("[Client] Event error matches quota limits. Setting hasQuotaError=true.");
                 setHasQuotaError(true);
               }
               setGenerationLogs(prev => [...prev, {
                 id: Math.random().toString(), timestamp, type: event.type, content: event.message
               }]);
            } else if (event.type === "thinking" || event.type === "text") {
               setGenerationLogs(prev => {
                 try {
                   const lastLog = prev[prev.length - 1];
                   const eventText = typeof event.text === 'string' ? event.text : (event.text ? String(event.text) : "");
                   
                   if (lastLog && lastLog.type === event.type) {
                     // Ignore exact duplicates
                     if (eventText === lastLog.content) return prev;

                     const lastContent = typeof lastLog.content === 'string' ? lastLog.content : "";
                     let newContent = lastContent;
                     if (eventText.startsWith(lastContent)) {
                       // API sent the full accumulated text
                       newContent = eventText;
                     } else {
                       // API sent a delta
                       newContent += eventText;
                     }

                     const updated = [...prev];
                     updated[updated.length - 1] = {
                       ...lastLog,
                       content: newContent,
                       timestamp
                     };
                     return updated;
                   }
                   return [...prev, { id: Math.random().toString(), timestamp, type: event.type, content: eventText }];
                 } catch (innerErr) {
                   console.error("[Client] Error inside setGenerationLogs callback:", innerErr);
                   return prev;
                 }
               });
            } else if (event.type === "tool_call") {
               console.log("[Client] Processing tool_call event:", event.name, "with args:", event.arguments);
               if (event.name === 'code_execution_call' || event.name === 'bash') {
                 const cmd = (event.arguments?.command || event.arguments?.code || "") as string;
                 if (cmd.includes('fetch_hn.py') || cmd.includes('fetch_github.py') || cmd.includes('fetch_url.py')) setCurrentStage('Researching topic...');
                 else if (cmd.includes('generate_script.py')) setCurrentStage('Writing script...');
                 else if (cmd.includes('generate_tts.py')) setCurrentStage('Generating speech...');
                 else if (cmd.includes('generate_music.py')) setCurrentStage('Generating music...');
                 else if (cmd.includes('mix_audio.py')) setCurrentStage('Mixing audio...');
                 else if (cmd.includes('generate_metadata.py')) setCurrentStage('Generating metadata...');
                 else if (cmd.includes('generate_image.py')) setCurrentStage('Generating cover image...');
               } else if (event.name === 'read_file' && event.arguments?.path) {
                 const path = event.arguments.path as string;
                 if (path.includes('skills/research')) setCurrentStage('Preparing research...');
                 else if (path.includes('skills/script-writing')) setCurrentStage('Preparing script...');
                 else if (path.includes('skills/tts-generation')) setCurrentStage('Preparing speech generation...');
                 else if (path.includes('skills/music-generation')) setCurrentStage('Preparing music generation...');
                 else if (path.includes('skills/audio-mixing')) setCurrentStage('Preparing audio mixing...');
                 else if (path.includes('skills/metadata-generation')) setCurrentStage('Preparing metadata...');
                 else if (path.includes('skills/cover-image-generation')) setCurrentStage('Preparing cover image...');
               }

               setGenerationLogs(prev => [...prev, {
                 id: Math.random().toString(), timestamp, type: 'tool_call', name: event.name, args: event.arguments
               }]);
            } else if (event.type === "tool_result") {
               console.log("[Client] Processing tool_result event for:", event.name);
               let resultText = event.result || "";
               if (resultText.length > 4000) resultText = resultText.substring(0, 4000) + "...";
               setGenerationLogs(prev => [...prev, {
                 id: Math.random().toString(), timestamp, type: 'tool_result', name: event.name, result: resultText
               }]);
            } else if (event.type === "show_data" && event.data) {
               console.log("[Client] Received show_data payload! Updating UI selection and library.", event.data);
               generatedShow = transformShow({
                 ...event.data,
                 coverImage: event.data.coverImage
               });
            }
          } catch (e) {
            console.error("Error parsing event:", e, dataStr);
          }
        }
      }

      // Add a slight delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (generatedShow) {
        const userShow = { ...generatedShow, isUserGenerated: true };
        
        // Persist to user's IndexedDB database
        try {
          await saveUserShow(userShow);
        } catch (e) {
          console.error("Error saving new show to IndexedDB:", e);
        }

        setSelectedShow(userShow);
        setLibrary(prev => [userShow, ...prev]);
        setGenerationComplete(true);
        setPrompt('');
        refreshQuota();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Generation aborted by user");
        setGenerationLogs(prev => [...prev, {
          id: Math.random().toString(), timestamp: new Date().toISOString().split('T')[1].split('.')[0], type: 'info', content: 'Generation stopped by user.'
        }]);
      } else {
        console.error("Failed to generate show:", error);
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("too_many_requests") || errMsg.toLowerCase().includes("resource_exhausted") || errMsg.toLowerCase().includes("limit")) {
          setHasQuotaError(true);
        }
        setGenerationLogs(prev => [...prev, {
          id: Math.random().toString(), timestamp: new Date().toISOString().split('T')[1].split('.')[0], type: 'error', content: `Error: ${errMsg}`
        }]);
      }
    }

    setIsGenerating(false);
  };

  const handleStop = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (generationIdRef.current) {
      try {
        await fetch('/api/cancel-show', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationId: generationIdRef.current })
        });
      } catch (err) {
        console.error("Failed to cancel show on server:", err);
      }
    }
    setIsGenerating(false);
  };

  const selectShow = (show: typeof MOCK_SHOW) => {
    setSelectedShow(show);
    setView('player');
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleDeleteShow = async (show: any) => {
    try {
      await deleteUserShow(show.title);
    } catch (e) {
      console.error("Failed to delete show from IndexedDB:", e);
    }

    setLibrary(prev => {
      const updatedLib = prev.filter(s => s.title !== show.title);
      if (selectedShow.title === show.title) {
        if (updatedLib.length > 0) {
          setTimeout(() => setSelectedShow(updatedLib[0]), 0);
        } else {
          setTimeout(() => setSelectedShow(MOCK_SHOW), 0);
        }
      }
      return updatedLib;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsScrolledToBottom(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  useEffect(() => {
    if (scrollRef.current && view === 'generating' && isScrolledToBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generationLogs, view, isScrolledToBottom]);

  if (view === 'generating') {
    return (
      <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden pb-10">
        <RainbowBackground />

        <div className="w-full max-w-4xl relative z-10 flex flex-col h-full overflow-hidden">
          <div className="text-center space-y-4 mb-8 shrink-0 mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 shadow-2xl relative mb-4">
              <div className="absolute inset-0 rounded-full border border-io-blue/30 animate-[spin_4s_linear_infinite]" />
              <Bot className="w-8 h-8 text-io-blue animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white/90">
              {generationComplete ? "Show Ready" : currentStage}
            </h2>
            <p className="text-white/40 font-medium text-sm max-w-lg mx-auto">Creating custom radio show about: "{activePrompt}"</p>
          </div>

          <div className="flex-1 overflow-hidden relative rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl flex flex-col">
            <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2 bg-white/[0.02] shrink-0 justify-between">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest ml-4 font-bold">Process Log</span>
               </div>
               {startTime && (
                 <div className="font-mono text-[10px] text-white/45 uppercase tracking-widest font-medium">
                   Elapsed: {formatElapsed(elapsedTime)} <span className="opacity-30">/</span> <span className="text-io-blue font-bold">Est: ~5 mins</span>
                 </div>
               )}
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4"
            >
              <AnimatePresence>
                {generationLogs.map((log) => {
                  if (log.type === 'tool_call' && (!log.args || Object.keys(log.args).length === 0)) {
                    return null;
                  }

                  let prefix = 'Info';
                  let color = 'text-white/60';
                  let Icon = Info;

                  if (log.type === 'tool_call') {
                     prefix = 'Action';
                     color = 'text-io-blue';
                     Icon = Settings2;
                  } else if (log.type === 'tool_result') {
                     prefix = 'Result';
                     color = 'text-io-green';
                     Icon = CheckCircle2;
                  } else if (log.type === 'thinking' || log.type === 'text') {
                     prefix = 'Log';
                     color = 'text-white/80';
                     Icon = TerminalSquare;
                  } else if (log.type === 'error') {
                     prefix = 'Error';
                     color = 'text-red-400';
                     Icon = Info;
                  }

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-4 md:gap-6 font-mono text-xs md:text-sm group"
                    >
                      <div className="w-16 shrink-0 text-white/40 text-right pt-0.5">
                        {log.timestamp}
                      </div>
                      <div className="flex gap-3 w-28 shrink-0 items-start pt-0.5">
                         <Icon className={`w-4 h-4 ${color} shrink-0`} />
                         <span className={`${color} font-bold uppercase tracking-wider text-[10px] mt-0.5 w-full`}>{prefix}</span>
                      </div>
                      <div className="flex-1 break-words whitespace-pre-wrap text-white/80 leading-relaxed max-w-2xl bg-white/[0.02] px-3 py-2 -mt-2 rounded border border-transparent hover:border-white/5 transition-colors">
                        {log.type === 'tool_call' ? (
                          <div className="space-y-2">
                            <div className="font-bold text-io-blue">{humanizeToolName(log.name || '')}</div>
                            {log.name === 'read_file' && log.args?.path ? (
                              <div className="bg-black/40 p-3 rounded-lg text-white/70 font-mono text-[10px] border border-white/5">
                                <span className="text-white/40">path:</span> {log.args.path}
                              </div>
                            ) : log.name === 'list_files' && log.args?.path ? (
                              <div className="bg-black/40 p-3 rounded-lg text-white/70 font-mono text-[10px] border border-white/5">
                                <span className="text-white/40">path:</span> {log.args.path}
                              </div>
                            ) : log.args && log.args.command ? (
                              <pre className="bg-black/40 p-3 rounded-lg text-white/70 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] border border-white/5">
                                {scrubText(log.args.command)}
                              </pre>
                            ) : log.args && log.args.code ? (
                              <div className="bg-black/40 p-3 rounded-lg text-white/70 overflow-x-auto font-mono text-[10px] border border-white/5">
                                {log.args.language && <div className="text-white/40 mb-1">{log.args.language}</div>}
                                <pre className="whitespace-pre-wrap">{scrubText(log.args.code)}</pre>
                              </div>
                            ) : log.args && Object.keys(log.args).length > 0 ? (
                              <pre className="bg-black/40 p-3 rounded-lg text-white/70 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] border border-white/5">
                                {scrubText(JSON.stringify(log.args, null, 2))}
                              </pre>
                            ) : null}
                          </div>
                        ) : log.type === 'tool_result' ? (
                          <div className="space-y-2">
                            <div className={`font-bold ${log.result?.includes('"error"') || log.result?.startsWith('Error:') ? 'text-red-400' : 'text-io-green'}`}>
                              Result: {humanizeToolName(log.name || 'output')}
                            </div>
                            {formatToolResult(log.name, log.result)}
                          </div>
                        ) : (
                          renderMarkdown(scrubText(log.content || ''))
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isGenerating ? (
                <div className="flex flex-col items-center gap-6 pt-4">
                  <div className="flex gap-4 md:gap-6 font-mono text-xs md:text-sm opacity-50 w-full">
                     <div className="w-16 shrink-0" />
                     <div className="flex gap-3 w-28 shrink-0 items-start pt-0.5">
                       <Loader2 className="w-4 h-4 text-io-blue shrink-0 animate-spin" />
                       <span className="text-io-blue font-bold uppercase tracking-wider text-[10px] mt-0.5">Working</span>
                     </div>
                     <div className="flex-1">
                       <span className="inline-flex gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-io-blue animate-bounce" />
                         <span className="w-1.5 h-1.5 rounded-full bg-io-blue animate-bounce delay-75" />
                         <span className="w-1.5 h-1.5 rounded-full bg-io-blue animate-bounce delay-150" />
                       </span>
                     </div>
                  </div>
                  <button
                    onClick={handleStop}
                    className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold text-xs tracking-widest uppercase transition-colors border border-red-500/20"
                  >
                    Stop Agent
                  </button>
                </div>
              ) : generationComplete ? (
                <div className="pt-8 pb-4 flex flex-col items-center gap-4">
                  <div className="text-io-green font-bold tracking-widest uppercase text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Show Ready
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setView('player');
                        setGenerationComplete(false);
                      }}
                      className="px-8 py-3 bg-white text-black rounded-xl font-bold text-sm tracking-widest uppercase transition-colors hover:scale-105 cursor-pointer"
                    >
                      {mediaMode === 'script' ? '📝 生成された台本を開く' : 'Listen Now'}
                    </button>
                    <button
                      onClick={downloadLogs}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                    >
                      Download Logs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  {hasQuotaError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="my-6 p-6 rounded-2xl bg-red-400/10 border border-red-500/20 backdrop-blur-md flex flex-col md:flex-row items-start gap-4 text-left max-w-2xl mx-auto w-full"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mx-auto md:mx-0">
                        <ShieldAlert className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-3 flex-1 text-center md:text-left">
                        <h4 className="font-bold text-red-200 text-xs md:text-sm tracking-wide uppercase">AI Studio Quota Limit Handled</h4>
                        <p className="text-white/75 text-xs leading-relaxed font-sans">
                          The current Gemini API key has run out of request quota for generating complete shows. Generating background soundscapes, distinct host voices via Lyria & Speech models, and painting covers demands a persistent billing plan or a personal Gemini API key.
                        </p>
                        <div className="text-[11px] text-white/60 bg-black/30 p-3 rounded-lg font-sans space-y-1">
                          <div className="font-bold text-red-300">How to unlock unlimited generations:</div>
                          <div>1. Go to the top-right <span className="font-semibold text-white/90">Settings &gt; Secrets</span> inside AI Studio.</div>
                          <div>2. Locate <span className="font-mono text-io-blue font-bold">GEMINI_API_KEY</span>.</div>
                          <div>3. Enter your own personal billed Google Gemini API Key.</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div className="pt-4 pb-4 flex justify-center gap-4 w-full">
                    <button
                      onClick={() => setView('home')}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={downloadLogs}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm tracking-widest uppercase transition-colors"
                    >
                      Download Logs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'home') {
    const templateCategories = [
      { id: 'tech', label: 'Tech & AI' },
      { id: 'culture', label: 'Arts & Life' },
      { id: 'news', label: 'News & Sports' }
    ] as const;

    const templates = {
      tech: [
        {
          title: "Daily Hacker Bites",
          desc: "Voice a digest of the top stories currently on Hacker News",
          prompt: "Generate a radio show called Daily Hacker Bites based on top Hacker News stories.",
          duration: "3"
        },
        {
          title: "GitHub Roundtable",
          desc: "Review the AlphaFold 3 repository and Google DeepMind's biology model",
          prompt: "Generate a radio show with a roundtable concept, educating listeners about https://github.com/google-deepmind/alphafold3.",
          duration: "3"
        }
      ],
      culture: [
        {
          title: "Philosophy Café",
          desc: "Host an atmospheric debate analyzing existentialism and humanity's future",
          prompt: "Generate a thought-provoking discussion in a cozy café setting discussing existential questions.",
          duration: "3"
        },
        {
          title: "Cinematic Reviews",
          desc: "Break down the visual style & legacy of iconic film directors",
          prompt: "Generate a talk radio segment analyzing the distinct visual styles of movie directors.",
          duration: "3"
        }
      ],
      news: [
        {
          title: "Sports Tournament Debate",
          desc: "Lively debate about preparations and predictions for a major tournament",
          prompt: "Generate a lively sports debate about preparations for a major upcoming tournament.",
          duration: "3"
        },
        {
          title: "Fintech Briefing",
          desc: "Explain decentralized finance developments and global stock market trends",
          prompt: "Generate a radio segment providing an interactive briefing on fintech and global markets.",
          duration: "3"
        }
      ]
    };

    return (
      <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden font-sans select-none flex flex-col">
        <RainbowBackground />

        <div className="relative z-10 w-full h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-12 p-6 md:p-16">
            {/* Header */}
            {!IS_DEV && (authLoading || currentUser) && (
              <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  {authLoading ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-white/40">
                      <Loader2 className="w-3 h-3 animate-spin text-io-blue" />
                      <span>CHECKING SECURE SESSION...</span>
                    </div>
                  ) : currentUser ? (
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full border border-white/25 shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-io-blue border border-white/25 shadow-sm flex items-center justify-center text-[10px] font-bold text-white">
                          {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/90 leading-tight">
                          {currentUser.displayName || "Google User"}
                        </span>
                        <span className="text-[9px] font-medium font-mono text-white/40 leading-none mt-0.5">
                          {currentUser.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="ml-2 text-[9px] font-bold font-mono text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer"
                      >
                        SIGN OUT
                      </button>
                    </div>
                  ) : null}
                </div>

                {currentUser && quota && (
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold font-mono tracking-tight text-white/90"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${quota.remaining > 0 ? 'bg-io-green animate-pulse' : 'bg-io-red'}`} />
                    <span>
                      DAILY ALLOWANCE: {quota.remaining}/{quota.limit} SHOWS AVAILABLE
                    </span>
                  </div>
                )}
              </header>
            )}

            {/* Hero / Generator */}
            <section className="space-y-8">
              <div className="text-center space-y-4 mb-8 select-none">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-bold text-yellow-300/90 tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  <span>GeminiSpark Daily Fortune Radio</span>
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl md:text-6xl font-black tracking-tight text-white/95 leading-[1.15]"
                >
                  占い <span className="text-gradient-io">AI Talk Radio</span>
                </motion.h1>
                <p className="text-white/60 text-sm md:text-base font-medium font-sans max-w-2xl mx-auto">
                  GeminiSparkで取得した毎日の占い情報を、星読みパーソナリティとリスナーが織りなす本格トークラジオ番組へ
                </p>

                {/* Mode Switcher */}
                <div className="pt-2 flex justify-center">
                  <div className="inline-flex p-1 bg-white/[0.04] border border-white/10 rounded-full backdrop-blur-md gap-1">
                    <button
                      type="button"
                      onClick={() => setRadioMode('fortune')}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        radioMode === 'fortune'
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>GeminiSpark 占いから生成</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRadioMode('general')}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        radioMode === 'general'
                          ? 'bg-white text-black shadow-lg shadow-white/10'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>自由トピック・通常モード</span>
                    </button>
                  </div>
                </div>
              </div>

              {radioMode === 'fortune' ? (
                /* ─── FORTUNE RADIO STUDIO ─── */
                <div className="space-y-6">
                  {currentUser && quota && quota.remaining === 0 && !IS_DEV ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-black/40 border border-io-red/30 backdrop-blur-md flex items-center gap-3 text-white text-xs font-semibold"
                    >
                      <ShieldAlert className="w-5 h-5 text-io-red shrink-0 font-sans" />
                      <span>本日の番組生成可能枠（{quota.limit}回）に達しました。明日また新しい番組を生成できます。</span>
                    </motion.div>
                  ) : null}

                  {/* Main Fortune Studio Card */}
                  <div className="relative group/fortune">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-blue-500/20 rounded-[2rem] blur-xl opacity-60 group-hover/fortune:opacity-80 transition duration-1000" />
                    
                    <div className="relative bg-[#0d0d0d]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
                      
                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* 【制作形式】ラジオ番組 or ニュース特報動画の選択 (Media Mode) */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="space-y-4 pb-6 border-b border-white/10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-amber-500/20">
                              ★
                            </div>
                            <div>
                              <span className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                                {fortuneLanguage === 'ja' ? '制作メディアを選択（ラジオ / 動画 / 台本のみ）' : 'Select Media Output (Radio / Video / Script Only)'}
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                  CHOICE
                                </span>
                              </span>
                              <span className="text-[11px] text-white/50 block font-sans">
                                {fortuneLanguage === 'ja'
                                  ? '音声ラジオ番組、YouTube・SNS向けの字幕付き特報動画、またはテキストのみの放送台本作成から選択'
                                  : 'Choose audio radio broadcast, HD video show with subtitles, or text-only broadcast script'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* Radio Card */}
                          <button
                            type="button"
                            onClick={() => setMediaMode('radio')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                              mediaMode === 'radio'
                                ? 'border-purple-400/80 bg-gradient-to-br from-purple-900/40 via-indigo-900/25 to-black/60 shadow-xl shadow-purple-900/20 ring-1 ring-purple-400/30'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                                  <Radio className="w-5 h-5" />
                                </div>
                                {mediaMode === 'radio' && (
                                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                                )}
                              </div>
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <span>📻 音声ラジオ番組（Radio）</span>
                              </h4>
                              <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                                {fortuneLanguage === 'ja'
                                  ? '耳で楽しむ本格ポッドキャスト。作業用BGM、リスナー生電話、妖美な数霊トークの音声コンテンツ'
                                  : 'Audio podcast with immersive listener phone calls and Master Minato voice'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-purple-300 font-mono pt-2 border-t border-white/5">
                              <span>出力: 高音質音声 + 台本</span>
                            </div>
                          </button>

                          {/* Video Card */}
                          <button
                            type="button"
                            onClick={() => setMediaMode('video')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                              mediaMode === 'video'
                                ? 'border-amber-400/90 bg-gradient-to-br from-amber-950/40 via-rose-950/30 to-black/70 shadow-xl shadow-amber-500/20 ring-1 ring-amber-400/40'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                                  <Film className="w-5 h-5" />
                                </div>
                                {mediaMode === 'video' && (
                                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <span>🎬 ニュース特報動画（Video）</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">HD</span>
                              </h4>
                              <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                                {fortuneLanguage === 'ja'
                                  ? 'YouTube・TikTok・Reels用。リアルタイム字幕テロップ、音声波形、HD特報ニュース帯付きの動画'
                                  : 'Video show with animated sound waves, live synchronized subtitles, and breaking news graphics'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-mono pt-2 border-t border-white/5">
                              <span>出力: HD動画 + 字幕テロップ</span>
                            </div>
                          </button>

                          {/* Script Mode Card */}
                          <button
                            type="button"
                            onClick={() => setMediaMode('script')}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                              mediaMode === 'script'
                                ? 'border-emerald-400/90 bg-gradient-to-br from-emerald-950/50 via-teal-950/30 to-black/70 shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                                  <FileText className="w-5 h-5" />
                                </div>
                                {mediaMode === 'script' && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                                <span>📝 台本モード（Script Only）</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">テキストのみ</span>
                              </h4>
                              <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                                {fortuneLanguage === 'ja'
                                  ? '音声合成をスキップし、ミナトの放送台本テキストのみを高速作成。ワンクリックで全文コピー＆保存可能'
                                  : 'Skip audio synthesis and quickly generate Master Minato broadcast script as text only with 1-click copy & export'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono pt-2 border-t border-white/5">
                              <span>出力: 放送台本テキスト（高速・コピー/保存対応）</span>
                            </div>
                          </button>
                        </div>

                        {/* Script Mode Sub-Banner */}
                        {mediaMode === 'script' && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 text-xs text-emerald-200 font-bold">
                              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                📝 台本モード（テキストのみ）：音声合成を行わないため待ち時間なしで台本を作成します。生成後は「全文コピー」「セリフのみコピー」「.txt保存」がワンクリックで使えます。
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Video Customization Sub-Bar if Video is Selected */}
                        {mediaMode === 'video' && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/30 space-y-3"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                                  <Tv className="w-3.5 h-3.5" />
                                  <span>動画のアスペクト比（画面比率）</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { id: '16:9', label: '16:9 横型（YouTube / PC）' },
                                    { id: '9:16', label: '9:16 縦型（TikTok / Shorts）' },
                                    { id: '1:1', label: '1:1 正方形（Instagram / X）' },
                                  ].map(r => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => setVideoAspectRatio(r.id as any)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        videoAspectRatio === r.id
                                          ? 'bg-amber-400 text-black shadow-md'
                                          : 'bg-black/50 text-white/70 hover:text-white border border-white/10'
                                      }`}
                                    >
                                      {r.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>映像演出スタイル</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { id: 'breaking_news', label: '🚨 特報ニュース速報' },
                                    { id: 'golden_mandala', label: '🔮 黄金数霊ホログラム' },
                                    { id: 'cyber_neon', label: '🎙️ ネオンサイバー' },
                                  ].map(s => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setVideoStyle(s.id as any)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        videoStyle === s.id
                                          ? 'bg-amber-400 text-black shadow-md'
                                          : 'bg-black/50 text-white/70 hover:text-white border border-white/10'
                                      }`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* ① 言語を選択 (Select Language) */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="space-y-3 pb-5 border-b border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                              ①
                            </div>
                            <span className="text-sm font-bold text-white tracking-wide">
                              {fortuneLanguage === 'ja' ? '放送言語を選択' : 'Select Broadcast Language'}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/40 font-mono">STEP 1 / 4</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setFortuneLanguage('ja');
                              if (!fortuneInputText || fortuneInputText.includes('Sacred Numerology')) {
                                setFortuneInputText('');
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              fortuneLanguage === 'ja'
                                ? 'border-purple-500/60 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 shadow-lg shadow-purple-900/20'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🇯🇵</span>
                              <div>
                                <div className="text-xs font-bold text-white">日本語 (Japanese)</div>
                                <div className="text-[10px] text-white/50">数霊師ミナトによる日本語放送</div>
                              </div>
                            </div>
                            {fortuneLanguage === 'ja' && (
                              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFortuneLanguage('en');
                              if (!fortuneInputText || fortuneInputText.includes('数霊＆12星座')) {
                                setFortuneInputText('');
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              fortuneLanguage === 'en'
                                ? 'border-blue-500/60 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 shadow-lg shadow-blue-900/20'
                                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🇺🇸</span>
                              <div>
                                <div className="text-xs font-bold text-white">English</div>
                                <div className="text-[10px] text-white/50">Master Minato's Global Broadcast</div>
                              </div>
                            </div>
                            {fortuneLanguage === 'en' && (
                              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* ② 占いのテキストを入力する (Input Fortune Text) */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="space-y-4 pb-5 border-b border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                              ②
                            </div>
                            <span className="text-sm font-bold text-white tracking-wide">
                              {fortuneLanguage === 'ja' ? '占いのテキストを入力する' : 'Input Fortune-Telling Text'}
                            </span>
                          </div>

                          <div className="flex p-0.5 bg-white/[0.04] border border-white/5 rounded-full shrink-0">
                            <button
                              type="button"
                              onClick={() => setFortuneTab('paste')}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                fortuneTab === 'paste'
                                  ? 'bg-white text-black shadow-sm'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{fortuneLanguage === 'ja' ? 'GeminiSparkを貼り付け' : 'Paste Fortune Text'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFortuneTab('auto_generate')}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                fortuneTab === 'auto_generate'
                                  ? 'bg-white text-black shadow-sm'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>{fortuneLanguage === 'ja' ? 'Geminiで占いを生成' : 'Generate via Gemini'}</span>
                            </button>
                          </div>
                        </div>

                        {fortuneTab === 'paste' ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <textarea
                                rows={5}
                                placeholder={
                                  fortuneLanguage === 'ja'
                                    ? "GeminiSparkで毎日取得している占い情報（12星座ランキング、全体運、各星座の運勢、数霊、ラッキーアイテム、開運アクションなど）をここに貼り付けてください..."
                                    : "Paste your daily fortune-telling text from GeminiSpark (12 zodiac rankings, overall cosmic energy, lucky items, actions, numbers)..."
                                }
                                value={fortuneInputText}
                                onChange={(e) => setFortuneInputText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs md:text-sm font-normal text-white/90 focus:outline-none focus:border-purple-500/50 placeholder:text-white/25 resize-y min-h-[120px] leading-relaxed font-mono"
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleInsertSampleFortune}
                                  className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs active:scale-95"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>✨ {fortuneLanguage === 'ja' ? '数霊＆12星座サンプルデータを自動入力' : 'Insert Sample Fortune Data'}</span>
                                </button>
                                {fortuneInputText && (
                                  <button
                                    type="button"
                                    onClick={() => setFortuneInputText('')}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer text-xs"
                                  >
                                    {fortuneLanguage === 'ja' ? 'クリア' : 'Clear'}
                                  </button>
                                )}
                              </div>
                              <span className="text-white/40 text-[11px] font-mono">
                                {fortuneInputText.length > 0
                                  ? `${fortuneLanguage === 'ja' ? '入力済み' : 'Length'}: ${fortuneInputText.length}文字`
                                  : fortuneLanguage === 'ja' ? '未入力（空欄の場合はサンプルで自動生成）' : 'Empty (default sample used if blank)'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Auto-generate tab */
                          <div className="space-y-4 bg-black/30 border border-white/5 rounded-2xl p-4 md:p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                                  <span>{fortuneLanguage === 'ja' ? '占いの対象日' : 'Target Date'}</span>
                                </label>
                                <input
                                  type="date"
                                  value={fortuneDate}
                                  onChange={(e) => setFortuneDate(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500/50"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                                  <span>{fortuneLanguage === 'ja' ? '特集テーマ / 着眼点（任意）' : 'Theme / Focus (Optional)'}</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={fortuneLanguage === 'ja' ? "例: 今週の仕事運と人間関係、新月の開運祈願" : "e.g., Career breakthrough, relationship harmony"}
                                  value={fortuneFocus}
                                  onChange={(e) => setFortuneFocus(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 placeholder:text-white/20"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                              <button
                                type="button"
                                disabled={isGeneratingFortuneData}
                                onClick={handleAutoGenerateFortuneData}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {isGeneratingFortuneData ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{fortuneLanguage === 'ja' ? 'Geminiで占いデータを取得中...' : 'Fetching horoscope via Gemini...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                    <span>🔮 {fortuneLanguage === 'ja' ? '今日の12星座占いをGeminiで生成' : 'Generate Horoscope via Gemini'}</span>
                                  </>
                                )}
                              </button>

                              {generatedFortunePreview && (
                                <span className="text-xs text-io-green font-bold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{generatedFortunePreview.date} {fortuneLanguage === 'ja' ? 'の占いデータを取得完了' : 'data ready'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* ③ 声を選択する（サンプルボイスを事前に登録）→ キャラクター名は数霊師ミナト */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="space-y-4 pb-5 border-b border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs">
                              ③
                            </div>
                            <div>
                              <span className="text-sm font-bold text-white tracking-wide">
                                {fortuneLanguage === 'ja' ? '声を選択する（サンプルボイス事前登録・試聴）' : 'Select Voice & Listen to Sample Voice'}
                              </span>
                            </div>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
                            <Flame className="w-3 h-3 text-amber-400" />
                            <span>{fortuneLanguage === 'ja' ? 'キャラクター名: 数霊師ミナト' : 'Character: Master Minato'}</span>
                          </div>
                        </div>

                        {/* ⏱️ Cooldown Status & Immediate Reset Banner */}
                        {cooldownStatus && (cooldownStatus.ttsCooldownActive || cooldownStatus.imageCooldownActive) && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border border-amber-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg shadow-amber-500/10 animate-fadeIn">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                                <Clock className="w-4 h-4 animate-pulse" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-amber-200">
                                    {cooldownStatus.ttsCooldownActive ? 'TTS待機クールタイム発動中' : '画像生成クールタイム発動中'}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold border border-amber-400/30">
                                    残り: {cooldownStatus.ttsCooldownActive ? `${Math.ceil(cooldownStatus.ttsCooldownRemainingSec / 60)}分 (${cooldownStatus.ttsCooldownRemainingSec}秒)` : `${Math.ceil(cooldownStatus.imageCooldownRemainingSec / 60)}分`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-white/70">
                                  無料枠クォータ保護のため一時待機中です（クールタイムは5分間）。すぐ再試行したい場合は右のリセットボタンを押してください。
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleResetCooldown}
                              disabled={isResettingCooldown}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
                            >
                              {isResettingCooldown ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>解除中...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>クールタイムを即時解除</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Character Info Card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/15 border border-amber-400/30 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-lg shadow-amber-500/5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-600 to-indigo-700 p-0.5 shrink-0 shadow-lg shadow-amber-500/25">
                            <div className="w-full h-full bg-black/70 rounded-[14px] flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-amber-300" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-black text-white tracking-wide">
                                {fortuneLanguage === 'ja' ? '数霊師ミナト (Master Minato)' : 'Master Minato (Sacred Numerologist)'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 font-mono">
                                <Volume2 className="w-3 h-3 text-amber-300" />
                                {fortuneLanguage === 'ja' ? '添付音声「S_6_minato.wav」準拠' : 'Based on S_6_minato.wav'}
                              </span>
                            </div>
                            <div className="mt-1.5 p-2.5 rounded-xl bg-black/60 border border-amber-400/20 text-[11px] text-amber-200 font-sans italic leading-relaxed">
                              {fortuneLanguage === 'ja'
                                ? '「幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。ここにたどり着いたあなたへ ほんの少しのお手伝いを。」'
                                : '"You who seek happiness. You who do not want to let happiness slip away. This is a sanctuary for seekers yearning for the resonance of bliss. Welcome to Minato\'s Place of Resonance."'}
                            </div>
                            <p className="text-[11px] text-white/60 leading-tight mt-1.5 font-sans">
                              {fortuneLanguage === 'ja'
                                ? '妖美でサディスティック、深淵の数霊で迷える魂の真実を見透かし甘美な救済を与えるカリスマ。以下の4つの事前登録ボイスからお好みのトーンを選択・試聴できます。'
                                : 'An alluring, elegantly teasing occult numerologist who unmasks destiny and delivers salvation. Select from 4 pre-registered presets below to listen to sample voices.'}
                            </p>
                          </div>
                        </div>

                        {/* 🌸 Irodori-TTS GitHub Integration Banner */}
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-black border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/30">
                              <span className="text-lg">🌸</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-black text-rose-200">
                                  Irodori-TTS（アプリ内蔵ボイスクローン音声エンジン）
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  irodoriEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/5 text-white/40 border-white/10'
                                }`}>
                                  {irodoriEnabled ? '● 内蔵エンジン有効中（回数無制限）' : '○ クローンOFF'}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/60 leading-tight mt-0.5 font-sans">
                                外部サーバー不要でサンプルボイス（WAV）の音響プロファイルからミナトのMP3音声を無制限に合成
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const nextState = !irodoriEnabled;
                                setIrodoriEnabled(nextState);
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('irodori_enabled', String(nextState));
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                irodoriEnabled
                                  ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-sm'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                              }`}
                            >
                              {irodoriEnabled ? 'クローンON' : 'クローンOFF'}
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsIrodoriModalOpen(true)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>連携設定</span>
                            </button>
                          </div>
                        </div>

                        {/* 4 Pre-registered Voice Presets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {MINATO_VOICE_PRESETS.map((preset) => {
                            const isSelected = selectedVoicePresetId === preset.id;
                            const isPlayingThisSample = previewingVoiceId === preset.id;
                            const isLoadingThisSample = sampleVoiceLoadingId === preset.id;

                            return (
                              <div
                                key={preset.id}
                                onClick={() => handleSelectVoicePreset(preset.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                                  isSelected
                                    ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-purple-950/30 to-black shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30'
                                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono ${
                                        preset.id === 'official_alluring' 
                                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' 
                                          : 'bg-white/10 text-white/80 border-white/10'
                                      }`}>
                                        {preset.tag}
                                      </span>
                                      <h4 className="text-xs font-black text-white">{preset.name}</h4>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/20'
                                    }`}>
                                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                                    {preset.desc}
                                  </p>

                                  {/* Sample phrase badge */}
                                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-[11px] text-amber-200/90 font-mono leading-relaxed italic">
                                    {fortuneLanguage === 'en' ? preset.sampleEn : preset.sampleJa}
                                  </div>
                                </div>

                                {/* Preview Button */}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaySampleVoice(preset);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                                      isPlayingThisSample
                                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30 animate-pulse'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                                  >
                                    {isLoadingThisSample ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>生成中...</span>
                                      </>
                                    ) : isPlayingThisSample ? (
                                      <>
                                        <Volume2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>■ 停止</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        <span>▶ サンプル試聴</span>
                                      </>
                                    )}
                                  </button>

                                  <span className="text-[10px] text-white/40 font-mono">
                                    {preset.geminiVoice}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* ④ 番組フォーマットを選択する (12星座の共鳴ランキング / 聞かないと損する開運アクション / 運命の救済解析データ) */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="space-y-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs">
                              ④
                            </div>
                            <span className="text-sm font-bold text-white tracking-wide">
                              {fortuneLanguage === 'ja' ? '番組フォーマットを選択する' : 'Select Program Format'}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/40 font-mono">STEP 4 / 4</span>
                        </div>

                        {/* 3 Formats Requested by User */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {[
                            {
                              id: 'resonance_ranking',
                              title: fortuneLanguage === 'ja' ? '12星座の共鳴ランキング' : '12 Zodiac Resonance Ranking',
                              icon: Award,
                              accent: 'border-yellow-500/40 from-yellow-500/10 to-transparent text-yellow-300',
                              desc: fortuneLanguage === 'ja'
                                ? '数霊と星の波動がシンクロする本日の星座運勢ランキング（1位〜12位）と共鳴スコアを発表'
                                : 'Daily resonance hierarchy (1st to 12th) syncing sacred numbers with planetary alignments.'
                            },
                            {
                              id: 'fortune_actions',
                              title: fortuneLanguage === 'ja' ? '聞かないと損する開運アクション' : 'Must-Listen Fortune Actions',
                              icon: Zap,
                              accent: 'border-emerald-500/40 from-emerald-500/10 to-transparent text-emerald-300',
                              desc: fortuneLanguage === 'ja'
                                ? '本日絶対に実行すべきラッキーアクション、避けるべきNG行動、数霊ナンバー＆開運アイテムを伝授'
                                : 'Essential daily turning actions, pitfalls to avoid, and secret sacred number amulets.'
                            },
                            {
                              id: 'destiny_salvation',
                              title: fortuneLanguage === 'ja' ? '運命の救済解析データ' : 'Destiny Salvation Analysis Data',
                              icon: Moon,
                              accent: 'border-purple-500/40 from-purple-500/10 to-transparent text-purple-300',
                              desc: fortuneLanguage === 'ja'
                                ? '迷えるリスナーの悩みを数霊で緊急解析。カルマを反転させ救済へと導く特別セッション'
                                : 'Urgent salvation protocol for listeners facing crossroads, unlocking destiny through sacred numbers.'
                            }
                          ].map((fmt) => {
                            const isSelected = fortuneFormat === fmt.id;
                            const IconComp = fmt.icon;

                            return (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => setFortuneFormat(fmt.id as any)}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                                  isSelected
                                    ? 'border-white/50 bg-white/10 shadow-xl'
                                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border bg-gradient-to-br ${fmt.accent}`}>
                                      <IconComp className="w-4 h-4" />
                                    </div>
                                    {isSelected && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-white leading-tight">{fmt.title}</h4>
                                  <p className="text-[11px] text-white/50 leading-relaxed font-sans">{fmt.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Broadcast Duration Settings */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mt-2 space-y-2">
                          <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{fortuneLanguage === 'ja' ? '放送時間モード' : 'Broadcast Duration Mode'}</span>
                          </label>
                          <select
                            value={fortuneDuration}
                            onChange={(e) => setFortuneDuration(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                          >
                            <option value="full" className="bg-neutral-900 text-amber-300 font-black">
                              {fortuneLanguage === 'ja' ? '✨ テキスト全文完全網羅（時間制限なし・全編ラジオ/動画化【推奨】）' : '✨ Full Text Coverage (All content covered without cutoff)'}
                            </option>
                            <option value="3" className="bg-neutral-900 text-white">
                              {fortuneLanguage === 'ja' ? '3分（標準ラジオ番組）' : '3 Minutes (Standard Show)'}
                            </option>
                            <option value="5" className="bg-neutral-900 text-white">
                              {fortuneLanguage === 'ja' ? '5分（ロング相談・救済スペシャル）' : '5 Minutes (Extended Special)'}
                            </option>
                            <option value="1" className="bg-neutral-900 text-white">
                              {fortuneLanguage === 'ja' ? '1分（ショート速報ダイジェスト）' : '1 Minute (Short Digest)'}
                            </option>
                          </select>
                          {fortuneDuration === 'full' && (
                            <p className="text-[11px] text-amber-300/80 font-medium flex items-center gap-1">
                              <span>💡</span>
                              <span>
                                {fortuneLanguage === 'ja'
                                  ? '放送時間で区切らず、入力テキスト全文（全12星座・開運アドバイス・リスナー相談回答）を最後まで完全音声化します'
                                  : 'The entire input text and consultation will be fully voiced without truncation'}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* ─────────────────────────────────────────────────────────── */}
                        {/* リスナー相談テーマ（有・無の選択 ＆ 話題のテーマから質問作成） */}
                        {/* ─────────────────────────────────────────────────────────── */}
                        <div className="bg-gradient-to-br from-emerald-950/20 via-purple-950/15 to-black/60 border border-emerald-500/25 rounded-2xl p-4 md:p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs md:text-sm font-black text-white">
                                  {fortuneLanguage === 'ja' ? 'リスナー相談テーマ（有・無の選択）' : 'Listener Consultation Theme (On / Off)'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  fortuneIncludeCaller
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-white/5 text-white/50 border-white/10'
                                }`}>
                                  {fortuneIncludeCaller
                                    ? (fortuneLanguage === 'ja' ? '● 相談テーマ：有' : '● ENABLED')
                                    : (fortuneLanguage === 'ja' ? '○ 相談テーマ：無' : '○ DISABLED')}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/60">
                                {fortuneLanguage === 'ja'
                                  ? 'ランダムで話題のテーマから質問内容を作成し、数霊師ミナトが回答する台本＆音声を番組に組み込みます'
                                  : 'Generate a trending listener question and have Master Minato answer it in the script and audio'}
                              </p>
                            </div>

                            {/* 有・無 Toggle Buttons */}
                            <div className="inline-flex p-1 rounded-xl bg-black/60 border border-white/10 shrink-0 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setFortuneIncludeCaller(true)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  fortuneIncludeCaller
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{fortuneLanguage === 'ja' ? '有（相談コーナーあり）' : 'ON (Include)'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFortuneIncludeCaller(false)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  !fortuneIncludeCaller
                                    ? 'bg-white/20 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                }`}
                              >
                                <span>{fortuneLanguage === 'ja' ? '無（ミナト単独語り）' : 'OFF (Solo Only)'}</span>
                              </button>
                            </div>
                          </div>

                          {fortuneIncludeCaller ? (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                              {/* Action Bar: Random Topic Button & AI Topic Generator */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectRandomConsultation()}
                                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-400/40 text-emerald-200 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/30 active:scale-95"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>
                                      {fortuneLanguage === 'ja'
                                        ? '🎲 ランダムで話題のテーマから質問を作成'
                                        : '🎲 Pick Random Trending Question'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isGeneratingConsultation}
                                    onClick={handleGenerateAIConsultation}
                                    className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                                  >
                                    {isGeneratingConsultation ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                                        <span>{fortuneLanguage === 'ja' ? '質問を作成中...' : 'Creating...'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                        <span>
                                          {fortuneLanguage === 'ja'
                                            ? '✨ AIで最新の話題から相談文を新規作成'
                                            : '✨ Generate Fresh Question via AI'}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {fortuneCustomTopic && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFortuneCustomTopic('');
                                      setSelectedConsultationMeta(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-white/50 hover:text-white transition-all cursor-pointer"
                                  >
                                    {fortuneLanguage === 'ja' ? 'クリア（自動ランダムへ戻す）' : 'Clear (Auto Random)'}
                                  </button>
                                )}
                              </div>

                              {/* Quick Trending Theme Chips */}
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-white/50 font-bold block">
                                  {fortuneLanguage === 'ja' ? '🔥 話題のテーマからワンクリックで質問を作成：' : '🔥 Trending Consultation Topics:'}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {TRENDING_CONSULTATION_PRESETS.map((preset) => {
                                    const isCurrent = selectedConsultationId === preset.id && fortuneCustomTopic.length > 0;
                                    return (
                                      <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handleSelectRandomConsultation(preset.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                                          isCurrent
                                            ? 'bg-emerald-400/25 border-emerald-400 text-emerald-200 shadow-sm'
                                            : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/25'
                                        }`}
                                      >
                                        {fortuneLanguage === 'en' ? preset.tagEn : preset.tagJa}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Active Theme Badge if Selected */}
                              {selectedConsultationMeta && fortuneCustomTopic && (
                                <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                                  <span className="font-black text-emerald-300">
                                    📩 {selectedConsultationMeta.category}
                                  </span>
                                  <span className="text-white/40">|</span>
                                  <span className="text-white/80 font-mono text-[11px]">
                                    {fortuneLanguage === 'ja' ? '相談者: ' : 'From: '}{selectedConsultationMeta.radioName}
                                  </span>
                                </div>
                              )}

                              {/* Editable Question Box */}
                              <div className="space-y-1.5">
                                <textarea
                                  rows={3}
                                  placeholder={
                                    fortuneLanguage === 'ja'
                                      ? '【おまかせランダム待機中】上の「🎲 ランダムで話題のテーマから質問を作成」を押すか、自由に入力してください（空欄のままでも番組生成時にランダムな話題テーマから自動で質問＆ミナトの回答が作成・音声化されます）'
                                      : 'Click "Pick Random Trending Question" above or type a custom question. If left blank, a random trending question will be automatically created and answered by Master Minato.'
                                  }
                                  value={fortuneCustomTopic}
                                  onChange={(e) => setFortuneCustomTopic(e.target.value)}
                                  className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-xs text-white/95 focus:outline-none focus:border-emerald-400/60 placeholder:text-white/35 resize-y leading-relaxed"
                                />
                                <p className="text-[11px] text-emerald-300/80 flex items-center gap-1.5">
                                  <span>🎙️</span>
                                  <span>
                                    {fortuneLanguage === 'ja'
                                      ? fortuneCustomTopic
                                        ? 'この質問内容に対して、数霊師ミナトが数霊術で回答する台本を作成し、最後まで完全音声化します。'
                                        : '未入力のまま生成しても、自動でランダムな話題テーマの質問が作成され、ミナトが答える台本＆音声が作成されます。'
                                      : 'Master Minato will answer this listener question in the generated radio script and full audio.'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-white/10 flex items-center gap-2.5 text-xs text-white/50">
                              <span>🔕</span>
                              <span>
                                {fortuneLanguage === 'ja'
                                  ? 'リスナー相談コーナーは挿入せず、数霊師ミナトによる星座運勢・数霊解説の単独語りのみで台本と音声を作成します。'
                                  : 'Listener consultation segment is disabled. The broadcast will feature Master Minato\'s solo reading only.'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ─────────────────────────────────────────────────────────── */}
                      {/* Generation Button */}
                      {/* ─────────────────────────────────────────────────────────── */}
                      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
                          <span className={`w-2 h-2 rounded-full ${mediaMode === 'video' ? 'bg-rose-400' : mediaMode === 'script' ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping`} />
                          <span>
                            {fortuneLanguage === 'ja'
                              ? (mediaMode === 'video'
                                  ? '数霊師ミナトによる特報動画（HD映像・リアルタイム字幕テロップ・音声）をGemini 3.8 Flashで生成'
                                  : mediaMode === 'script'
                                    ? '数霊師ミナトによる放送台本（テキストのみ・音声合成なし）を高速生成'
                                    : '数霊師ミナトによる台本・音声・カバーアートをGemini 3.8 Flashで生成')
                              : (mediaMode === 'video'
                                  ? 'Generating Master Minato news video, subtitles & voice via Gemini 3.8 Flash'
                                  : mediaMode === 'script'
                                    ? 'Generating Master Minato broadcast script (text only, no audio synthesis)'
                                    : 'Generating Master Minato script, voice & cover art via Gemini 3.8 Flash')}
                          </span>
                        </div>

                        {!currentUser && !IS_DEV ? (
                          <button
                            type="button"
                            onClick={handleSignIn}
                            className="w-full sm:w-auto px-7 py-3 bg-white text-black hover:bg-zinc-100 rounded-full font-bold uppercase tracking-wider text-xs transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-xl animate-pulse"
                          >
                            <span>Googleでログインして生成</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isGenerating || (quota && quota.remaining <= 0 && !IS_DEV)}
                            onClick={handleGenerateFortuneShow}
                            className={`w-full sm:w-auto px-8 py-3.5 rounded-full ${
                              mediaMode === 'video'
                                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 shadow-rose-500/25'
                                : mediaMode === 'script'
                                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-emerald-500/25'
                                  : 'bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 shadow-amber-500/20'
                            } text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2.5 cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50`}
                          >
                            {mediaMode === 'video' ? (
                              <Film className="w-4 h-4 text-amber-200" />
                            ) : mediaMode === 'script' ? (
                              <FileText className="w-4 h-4 text-emerald-100" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-amber-300" />
                            )}
                            <span>
                              {fortuneLanguage === 'ja'
                                ? (mediaMode === 'video'
                                    ? '🎬 数霊師ミナトの特報動画番組を生成する'
                                    : mediaMode === 'script'
                                      ? '📝 数霊師ミナトの放送台本（テキストのみ）を作成する'
                                      : '📻 数霊師ミナトの占いラジオ番組を生成する')
                                : (mediaMode === 'video'
                                    ? '🎬 Generate Master Minato News Video Show'
                                    : mediaMode === 'script'
                                      ? '📝 Generate Master Minato Script (Text Only)'
                                      : '📻 Generate Master Minato Fortune Radio')}
                            </span>
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                /* ─── GENERAL RADIO STUDIO (ORIGINAL) ─── */
                <>
                  <form onSubmit={(e) => {
                    if (quota && quota.remaining <= 0 && !IS_DEV) {
                      e.preventDefault();
                      return;
                    }
                    handleGenerate(e);
                  }} className="space-y-4">
                    {currentUser && quota && quota.remaining === 0 && !IS_DEV ? (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-black/40 border border-io-red/30 backdrop-blur-md flex items-center gap-3 text-white text-xs font-semibold"
                      >
                        <ShieldAlert className="w-5 h-5 text-io-red shrink-0 font-sans" />
                        <span>Your daily quota of {quota.limit} generations has been reached. Please come back tomorrow to generate more custom interactive radio shows!</span>
                      </motion.div>
                    ) : null}

                    <div className="relative group/box">
                      <div className="absolute -inset-1 bg-gradient-to-r from-io-blue/10 via-io-green/10 to-io-yellow/10 rounded-[1.5rem] blur opacity-30 group-focus-within/box:opacity-50 transition duration-1000"></div>
                      <div className="relative bg-[#0d0d0d]/85 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col gap-3 group-focus-within/box:border-white/20 transition-all duration-300">
                        <div className="w-full">
                          <textarea
                            rows={2}
                            placeholder="I want a talk radio show about...."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent p-2 text-sm md:text-base font-normal text-white/90 focus:outline-none placeholder:text-white/20 resize-none min-h-[50px] leading-relaxed"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-3 mt-1.5 gap-4">
                          {/* Left controls */}
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Duration Selector */}
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-full px-3 py-1.5 hover:bg-white/[0.08] transition-all relative focus-within:ring-2 focus-within:ring-io-blue focus-within:border-transparent">
                              <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                              <select
                                value={targetDuration}
                                onChange={(e) => setTargetDuration(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-bold text-white/70 focus:outline-none focus:ring-0 cursor-pointer appearance-none uppercase tracking-wider pr-1"
                              >
                                <option value="3" className="bg-neutral-900 text-white">3 Min</option>
                                <option value="5" className="bg-neutral-900 text-white">5 Min</option>
                                <option value="10" className="bg-neutral-900 text-white">10 Min</option>
                                <option value="15" className="bg-neutral-900 text-white">15 Min</option>
                              </select>
                            </div>

                            {/* Mood Selector */}
                            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-full px-3 py-1.5 hover:bg-white/[0.08] transition-all relative focus-within:ring-2 focus-within:ring-io-blue focus-within:border-transparent">
                              <List className="w-3.5 h-3.5 text-white/40 shrink-0" />
                              <select
                                value={targetMood}
                                onChange={(e) => setTargetMood(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-bold text-white/70 focus:outline-none focus:ring-0 cursor-pointer appearance-none uppercase tracking-wider pr-1"
                              >
                                <option value="Informative" className="bg-neutral-900 text-white">Informative</option>
                                <option value="Conversational" className="bg-neutral-900 text-white">Conversational</option>
                                <option value="Late Night Chill" className="bg-neutral-900 text-white">Late Night Chill</option>
                                <option value="Hype & Energetic" className="bg-neutral-900 text-white">Energetic</option>
                                <option value="Experimental" className="bg-neutral-900 text-white">Experimental</option>
                              </select>
                            </div>
                          </div>

                          {/* Right action button */}
                          {!currentUser && !IS_DEV ? (
                            <button
                              type="button"
                              onClick={handleSignIn}
                              className="px-5 py-2 bg-white text-black hover:bg-zinc-100 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-black/30 animate-pulse hover:animate-none"
                            >
                              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                              </svg>
                              Sign In with Google
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={isGenerating || (quota && quota.remaining <= 0 && !IS_DEV)}
                              className="px-6 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white rounded-full font-bold uppercase tracking-wider text-[11px] transition-all inline-flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-black/30"
                            >
                              {isGenerating ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                  Generating
                                </>
                              ) : (
                                <>
                                  Generate
                                  <img 
                                    src="https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg" 
                                    alt="Gemini" 
                                    className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300 pointer-events-none select-none"
                                    referrerPolicy="no-referrer"
                                  />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 text-[11px] text-white/30">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#fbbc04]/80 animate-pulse shadow-[0_0_6px_rgba(251,188,4,0.5)]" />
                        <span>Each radio show generation takes <strong className="text-white/60 font-bold">~5 minutes</strong> to research and voice.</span>
                      </div>
                      <div className="flex items-center gap-3.5">
                        <span>Please do not submit any sensitive or personal information.</span>
                      </div>
                    </div>
                  </form>

                  {/* Templates Panel */}
                  <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-[1.5rem] p-5 flex flex-col gap-4 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Try a template</span>
                      </div>
                      <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/5 rounded-full shrink-0">
                        {templateCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer ${selectedCategory === cat.id ? 'bg-white text-black font-extrabold shadow-sm' : 'text-white/55 hover:text-white/85'}`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {templates[selectedCategory].map((tmpl) => (
                        <button
                          key={tmpl.title}
                          type="button"
                          onClick={() => {
                            if (quota && quota.remaining <= 0) return;
                            setPrompt(tmpl.prompt);
                            setTargetDuration(tmpl.duration);
                            document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          disabled={isGenerating || (quota && quota.remaining <= 0)}
                          className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all duration-200 group relative overflow-hidden cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">
                              {tmpl.title}
                            </span>
                            <span className="text-xs text-white/30 group-hover:text-white/70 transition-transform group-hover:translate-x-0.5 font-bold">→</span>
                          </div>
                          <p className="text-xs text-white/50 mt-1 font-medium leading-relaxed group-hover:text-white/75 transition-colors">
                            {tmpl.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        {/* 🌸 Irodori-TTS Integration Modal (Home View) */}
        <IrodoriTtsModal
          isOpen={isIrodoriModalOpen}
          onClose={() => setIsIrodoriModalOpen(false)}
          enabled={irodoriEnabled}
          onToggleEnabled={(val) => {
            setIrodoriEnabled(val);
            if (typeof window !== 'undefined') {
              localStorage.setItem('irodori_enabled', String(val));
            }
          }}
          serverUrl={irodoriServerUrl}
          onServerUrlChange={(url) => {
            setIrodoriServerUrl(url);
            if (typeof window !== 'undefined') {
              localStorage.setItem('irodori_server_url', url);
            }
          }}
          apiKey={irodoriApiKey}
          onApiKeyChange={(key) => {
            setIrodoriApiKey(key);
            if (typeof window !== 'undefined') {
              localStorage.setItem('irodori_api_key', key);
            }
          }}
          styleEmoji={irodoriStyleEmoji}
          onStyleEmojiChange={setIrodoriStyleEmoji}
          promptAudioName={irodoriPromptAudioName}
          promptAudioBase64={irodoriPromptAudioBase64}
          onPromptAudioChange={(name, base64) => {
            setIrodoriPromptAudioName(name);
            setIrodoriPromptAudioBase64(base64);
          }}
        />
      </div>
    );
  }

  if (sharedShowLoading) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
        <RainbowBackground />
        <div className="space-y-6 text-center max-w-md relative z-10 w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 relative">
            <div className="absolute inset-0 rounded-full border border-io-blue/40 animate-[spin_6s_linear_infinite]" />
            <Loader2 className="w-10 h-10 text-io-blue animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white/90">Retrieving Shared Station...</h2>
            <p className="text-white/40 text-sm font-medium leading-relaxed">Connecting to container and retrieving dynamic radio show data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sharedShowError) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
        <RainbowBackground />
        <div className="space-y-8 text-center max-w-md relative z-10 p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-2xl w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-100 font-bold">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white/90">Playback Error</h2>
            <p className="text-red-200/80 text-sm font-medium leading-relaxed">{sharedShowError}</p>
          </div>
          <button
            onClick={remixSharedShow}
            className="w-full py-4 px-6 bg-white hover:bg-white/90 text-black font-extrabold rounded-2xl transition-all uppercase tracking-wider text-xs shadow-xl cursor-pointer"
          >
            Generate your own radio show
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden font-sans select-none flex flex-col">
      <RainbowBackground />

      <div className="absolute inset-0 z-10 w-full h-full flex flex-col lg:flex-row">

        {/* Left Column: Branding & Meta */}
        <aside className="w-full lg:w-[380px] h-[100px] lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-3xl shrink-0">
          
          {/* MOBILE ONLY BRANDING ROW - Super compact & elegant */}
          <div className="flex lg:hidden items-center justify-between px-4 h-full w-full gap-3">
            <button
              onClick={isSharedPlaybackMode ? remixSharedShow : () => setView('home')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 active:scale-95 transition-all text-xs font-bold cursor-pointer border border-white/5 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex-1 flex items-center gap-3 min-w-0 bg-white/[0.02] border border-white/5 px-3 py-2 rounded-2xl">
              <div className="w-14 h-8 rounded-lg overflow-hidden shrink-0 border border-white/10 aspect-video relative">
                <img
                  src={selectedShow.coverImage || "https://www.gstatic.com/aistudio/starter-apps/assets/ai_radio/cover.jpg"}
                  alt="News Scoop Cover"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black uppercase text-white tracking-wide truncate">{selectedShow.title}</h4>
                <p className="text-[10px] text-white/50 font-bold tracking-wider uppercase truncate mt-0.5 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-io-blue shrink-0" />
                  <span>{selectedShow.host}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsVideoExportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold shrink-0 active:scale-95"
              title="🎬 動画として書き出し"
            >
              <Film className="w-3.5 h-3.5 text-amber-300" />
              <span>動画</span>
            </button>
          </div>

          {/* DESKTOP ONLY BRANDING COLUMN - Original full design */}
          <div className="hidden lg:flex flex-col h-full overflow-hidden">
            <div className="p-10 pb-6 flex items-center justify-between shrink-0">
              <button
                onClick={isSharedPlaybackMode ? remixSharedShow : () => setView('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/75 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-white/5 shadow-sm group inline-flex"
              >
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Generator</span>
              </button>

              <button
                onClick={() => setIsVideoExportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 hover:from-amber-500/35 hover:to-rose-500/35 text-amber-300 hover:text-white transition-all text-xs font-bold cursor-pointer border border-amber-500/30 shadow-sm inline-flex active:scale-95"
              >
                <Film className="w-3.5 h-3.5 text-amber-300" />
                <span>🎬 動画書き出し</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-10 pb-10 space-y-10">
              <div>
                {(() => {
                  const titleStr = selectedShow.title.toUpperCase();
                  const words = titleStr.split(' ');
                  
                  const lines: string[] = [];
                  let current: string[] = [];
                  
                  words.forEach((word) => {
                    if (current.length === 0) {
                      current.push(word);
                    } else {
                      const candidate = [...current, word].join(' ');
                      if (candidate.length <= 12) {
                        current.push(word);
                      } else {
                        lines.push(current.join(' '));
                        current = [word];
                      }
                    }
                  });
                  if (current.length > 0) {
                    lines.push(current.join(' '));
                  }

                  const gradientClasses = [
                    "text-white",
                    "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-lime-400 to-orange-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent",
                    "bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent",
                  ];

                  return (
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.9] mt-2 mb-8 flex flex-col items-start gap-1.5 uppercase font-sans select-none">
                      {lines.map((line, idx) => {
                        const gradientClass = gradientClasses[idx % gradientClasses.length];
                        return (
                          <span key={idx} className={`block ${gradientClass}`}>
                            {line}
                          </span>
                        );
                      })}
                    </h1>
                  );
                })()}

                {/* 16:9 HD News Scoop Thumbnail */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {selectedShow.newsCategory || "BREAKING SCOOP / 特報"}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-white/40 tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/5">
                      16:9 HD BROADCAST
                    </span>
                  </div>

                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-neutral-950 flex items-center justify-center">
                    <img
                      src={selectedShow.coverImage || "https://www.gstatic.com/aistudio/starter-apps/assets/ai_radio/cover.jpg"}
                      alt="News Thumbnail Cover"
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.01]"
                    />

                    {/* Only show text overlay if coverImage is a plain generic photo without embedded news typography */}
                    {(!selectedShow.coverImage || !selectedShow.coverImage.startsWith('data:image/svg')) && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                        {/* Top Overlay Badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                          <span className="px-2 py-0.5 rounded-md bg-red-600/90 text-white font-black text-[9px] tracking-wider shadow">
                            速報 SCOOP
                          </span>
                          {selectedShow.anchoredMetric && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-950/85 border border-indigo-500/40 text-indigo-300 font-bold text-[9px]">
                              {selectedShow.anchoredMetric}
                            </span>
                          )}
                        </div>

                        {/* Bottom Headline Overlay */}
                        <div className="absolute bottom-2.5 inset-x-2.5 z-10">
                          <p className="text-xs font-black text-white leading-snug drop-shadow line-clamp-2">
                            {selectedShow.newsHeadline || selectedShow.title}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                      <div className="w-4 h-[1px] bg-io-blue" /> Episode Title
                    </h3>
                    <p className="text-lg font-bold leading-tight text-white/95">{selectedShow.title}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                      <div className="w-4 h-[1px] bg-io-green" /> Broadcast Summary
                    </h3>
                    <p className="text-xs leading-relaxed text-white/70 font-medium">
                      {selectedShow.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Neuromarketing & Behavioral Economics Scoop Analysis Panel */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black tracking-[0.25em] text-amber-400/90 uppercase flex items-center gap-2">
                    <div className="w-2.5 h-[1px] bg-amber-400" /> 行動経済学＆特報解析データ
                  </h3>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    {selectedShow.anchoredMetric || "的中率 89.4%"}
                  </span>
                </div>

                {/* Behavioral Economics Hooks Card */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-md">
                  {/* Loss Aversion Hook */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                      <span>⚠️ 損失回避警告（今すぐ聴くべき理由）</span>
                    </div>
                    <p className="text-xs text-white/80 font-medium leading-relaxed">
                      {selectedShow.lossAversionHook || "今日のアクションを逃すと運気激変の好機を逸する恐れがあります。今すぐ聴いて開運プロトコルを確認してください。"}
                    </p>
                  </div>

                  {/* Curiosity Gap */}
                  {(selectedShow.newsCatchphrase || selectedShow.curiosityGap) && (
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
                        <span>🔍 好奇心の空白（解禁された真相）</span>
                      </div>
                      <p className="text-xs text-white/70 font-medium leading-relaxed">
                        {selectedShow.newsCatchphrase || selectedShow.curiosityGap}
                      </p>
                    </div>
                  )}

                  {/* Sacred Numerology Key Data */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px]">
                    <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/40 block text-[9px]">数霊ナンバー</span>
                      <span className="text-sm font-black text-amber-400">{selectedShow.luckyNumber || "8"}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-white/40 block text-[9px]">共鳴1位 星座</span>
                      <span className="text-xs font-bold text-white/90">{selectedShow.bestSign || "おひつじ座"}</span>
                    </div>
                  </div>
                </div>

                {/* 🎙️ Voice Persona & Sample Reference Card */}
                {(() => {
                  const currentPreset = MINATO_VOICE_PRESETS.find(p => p.id === (selectedShow.voicePresetId || selectedVoicePresetId)) || MINATO_VOICE_PRESETS[0];
                  const isPlayingSample = previewingVoiceId === currentPreset.id;
                  const isLoadingSample = sampleVoiceLoadingId === currentPreset.id;

                  return (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-950/20 to-black border border-amber-500/30 space-y-2.5 shadow-lg shadow-amber-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <h4 className="text-[11px] font-black text-amber-300">
                            {fortuneLanguage === 'en' ? 'Voice Persona & Sample Voice' : 'ミナトの音声設定（サンプルボイス連動）'}
                          </h4>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 font-mono">
                          {currentPreset.tag}
                        </span>
                      </div>

                      <p className="text-[10px] text-white/70 leading-relaxed">
                        {currentPreset.desc}
                      </p>

                      <div className="p-2 rounded-xl bg-black/60 border border-white/10 text-[10px] text-amber-200/90 font-mono italic leading-relaxed">
                        {fortuneLanguage === 'en' ? currentPreset.sampleEn : currentPreset.sampleJa}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handlePlaySampleVoice(currentPreset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isPlayingSample
                              ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30 animate-pulse'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          {isLoadingSample ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>生成中...</span>
                            </>
                          ) : isPlayingSample ? (
                            <>
                              <Volume2 className="w-3.5 h-3.5 animate-spin" />
                              <span>■ 停止</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>▶ 基準サンプルを試聴</span>
                            </>
                          )}
                        </button>

                        <select
                          value={selectedShow.voicePresetId || selectedVoicePresetId}
                          onChange={(e) => {
                            const newPresetId = e.target.value;
                            const preset = MINATO_VOICE_PRESETS.find(p => p.id === newPresetId);
                            if (preset) {
                              handleSelectVoicePreset(preset.id);
                              setSelectedShow(prev => ({
                                ...prev,
                                voicePresetId: preset.id,
                                voicePresetName: preset.name,
                                voicePresetDesc: preset.desc,
                                voiceSampleText: fortuneLanguage === 'en' ? preset.sampleEn : preset.sampleJa,
                                voicePitch: preset.pitch,
                                voiceRate: preset.rate,
                                geminiVoice: preset.geminiVoice,
                              }));
                            }
                          }}
                          className="bg-black/60 border border-white/15 rounded-xl px-2 py-1 text-[10px] text-amber-200 font-bold focus:outline-none focus:border-amber-400/50 cursor-pointer"
                        >
                          {MINATO_VOICE_PRESETS.map(p => (
                            <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                {/* 🎬 動画として書き出し（Video Export）ボタン */}
                <button
                  type="button"
                  onClick={() => setIsVideoExportModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-500/20 active:scale-95 group"
                >
                  <Film className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span>🎬 動画として書き出し（Video Export）</span>
                </button>

                {/* Download HD News Thumbnail Button */}
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = selectedShow.coverImage;
                    a.download = `minato_news_thumbnail_${Date.now()}.png`;
                    a.click();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>HDニュースサムネイルを保存</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Transcript */}
        <div className="flex-1 w-full flex flex-col overflow-hidden bg-black/60">

          {/* Script Action Bar (Copy Full Script / Copy with Speaker & Timecode / Download .txt) */}
          <div className="px-4 md:px-8 py-3 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-30 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                selectedShow.mediaMode === 'script'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              }`}>
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white tracking-wide">
                    {selectedShow.mediaMode === 'script' ? '📝 放送台本モード（テキストのみ）' : '📝 放送台本・文字起こし'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                    全 {selectedShow.transcript.filter(t => t.type !== 'music').length} セリフ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Copy Pure Dialogue Only (for external TTS like Irodori-TTS / reading) */}
              <button
                type="button"
                onClick={() => {
                  const pureText = selectedShow.transcript
                    .filter(t => t.type !== 'music')
                    .map(t => t.text)
                    .join('\n\n');
                  navigator.clipboard.writeText(pureText);
                  setCopiedScriptMode('dialogue');
                  setTimeout(() => setCopiedScriptMode(null), 2500);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedScriptMode === 'dialogue' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>セリフ全文をコピー完了！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-300" />
                    <span>台本全文をコピー（セリフのみ）</span>
                  </>
                )}
              </button>

              {/* Copy with Speaker & Timecodes */}
              <button
                type="button"
                onClick={() => {
                  const formatted = selectedShow.transcript
                    .map(t => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
                    .join('\n\n');
                  navigator.clipboard.writeText(formatted);
                  setCopiedScriptMode('timecode');
                  setTimeout(() => setCopiedScriptMode(null), 2500);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedScriptMode === 'timecode' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                    <span>話者付きでコピー完了！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                    <span>話者・タイムコード付きコピー</span>
                  </>
                )}
              </button>

              {/* Download .txt */}
              <button
                type="button"
                onClick={() => {
                  const header = `========================================\n番組タイトル: ${selectedShow.title}\n作成日時: ${new Date().toLocaleString('ja-JP')}\n========================================\n\n`;
                  const body = selectedShow.transcript
                    .map(t => t.type === 'music' ? `\n--- 🎵 ${t.text} ---\n` : `【${t.speaker}】 (${t.timestamp})\n${t.text}`)
                    .join('\n\n');
                  const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedShow.title.replace(/[\\/:*?"<>|]/g, '_')}_台本.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>.txt保存</span>
              </button>
            </div>
          </div>

          {/* Transcript Section */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none"></div>

            <Transcript
              transcript={selectedShow.transcript}
              currentTime={currentTime}
              onSeek={seek}
              isScriptMode={selectedShow.mediaMode === 'script'}
            />
          </div>

          {/* Centered CTA Pill: Clear, impossible to miss, perfectly simple with no heavy gradients */}
          {isSharedPlaybackMode && (
            <div className="hidden md:flex px-4 md:px-8 pt-4 z-20 justify-center shrink-0 w-full max-w-3xl mx-auto">
              <div className="bg-neutral-950/90 border border-white/15 backdrop-blur-md px-6 py-4 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)] w-full justify-between border-io-blue/20">
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-io-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-io-blue"></span>
                  </span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white/95 block">Listening to shared radio show</span>
                    <span className="text-[10px] text-white/40 block">Generated via Google AI Studio</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                  {/* PRIMARY CTA */}
                  <button
                    onClick={remixSharedShow}
                    className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black font-extrabold text-xs px-5 py-3.5 rounded-xl transition-all hover:scale-102 active:scale-95 cursor-pointer inline-flex items-center gap-2 justify-center shadow-md shadow-white/5 shrink-0"
                  >
                    <span>Generate your own radio show</span>
                  </button>                
                </div>
              </div>
            </div>
          )}

          {/* Player Bar */}
          <div className="p-2 md:p-8 pb-3 md:pb-10 mt-auto space-y-3 max-w-6xl mx-auto w-full z-30">
            {/* Collapsible Mobile Disclaimer & CTA Banner (on top of player) */}
            {mobileDisclaimerExpanded && (
              <div className="block md:hidden border border-white/10 bg-neutral-950/95 backdrop-blur-md rounded-2xl p-4 space-y-4 shadow-xl relative z-30 select-none animate-fade-in">
                <div className="space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-io-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-io-blue"></span>
                      </span>
                      <span className="text-[11px] font-black tracking-[0.2em] text-white/90 uppercase font-sans">
                        {isSharedPlaybackMode ? 'Shared Radio Show' : 'Radio Broadcast'}
                      </span>
                    </div>

                    <button 
                      onClick={() => setMobileDisclaimerExpanded(false)}
                      className="flex items-center gap-1 text-white/40 hover:text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 rounded-lg transition-all cursor-pointer"
                    >
                      <span>Hide Info</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Important Disclaimer Notice (Highly visible, styled beautifully) */}
                  <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-[9px] tracking-wider uppercase">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Disclaimer</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/70 font-medium font-sans">
                      This simulated broadcast is user-generated content created using AI Studio. All hosts, voices and scripts are completely synthetic and fictional. It is not produced by or represent Google's opinions.
                    </p>
                  </div>

                  {/* Full CTAs styled elegantly and consistent with desktop */}
                  {isSharedPlaybackMode && (
                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        onClick={remixSharedShow}
                        className="w-full bg-white hover:bg-neutral-200 text-black font-extrabold text-xs h-11 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 justify-center shadow-md shadow-white/5 active:scale-[0.98]"
                      >
                        <span>Generate your own radio show</span>
                      </button>
                      <button
                        onClick={() => {
                          const appletId = getAppletId();
                          try {
                            window.parent?.postMessage({
                              type: 'CLONE_APPLET',
                              appletId: appletId
                            }, '*');
                          } catch (e) {}
                          const buildUrl = getAIStudioBuildUrl(appletId);
                          window.open(buildUrl, '_blank');
                        }}
                        className="w-full bg-transparent hover:bg-white/5 text-white border border-white/15 hover:border-white/30 font-bold text-xs h-11 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 justify-center active:scale-[0.98]"
                      >
                        <span>Remix in Google AI Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI generated content disclaimer card to prevent liability */}
            <div id="ai-disclaimer-card" className="hidden md:block p-3 md:p-3.5 rounded-2xl md:rounded-3xl bg-[#0f0f0f]/95 border border-amber-500/20 text-white/80 space-y-1 shadow-xl backdrop-blur-3xl relative">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[9px] md:text-[10px] tracking-[0.25em] uppercase">
                <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-amber-500" />
                <span>Disclaimer</span>
              </div>
              <p className="text-[10px] md:text-[11px] leading-relaxed text-white/60 font-medium font-sans">
                This simulated broadcast is user-generated content created using AI Studio. All hosts, voices and scripts are completely synthetic and fictional. It is not produced by or represent Google's opinions.
              </p>
            </div>

            <div className="bg-[#0f0f0f]/80 backdrop-blur-3xl border border-white/10 rounded-3xl md:rounded-[2.5rem] p-3 pl-4 pr-4 md:p-4 md:pl-6 md:pr-6 relative z-30 shadow-2xl">
              <div className="flex flex-row items-center gap-3 md:gap-4 relative z-10 w-full max-w-6xl mx-auto">
                {/* Play Button */}
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-full flex items-center justify-center bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current translate-x-0.5" />}
                </button>

                {/* Progress & Metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 md:gap-2.5 px-1 md:px-6">
                  <div className="flex flex-col md:flex-row md:items-baseline md:gap-3 text-left">
                    <div className="flex items-center gap-2 max-w-full">
                      <span className="text-white text-xs md:text-sm tracking-wider font-extrabold uppercase truncate block">
                        {selectedShow.title}
                      </span>
                      {/* Subtle toggle badge on mobile */}
                      <button 
                        onClick={() => setMobileDisclaimerExpanded(!mobileDisclaimerExpanded)}
                        className="md:hidden flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-amber-500 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 transition-colors cursor-pointer active:scale-95"
                      >
                        <Info className="w-2.5 h-2.5" />
                        <span>{mobileDisclaimerExpanded ? 'Hide Info' : 'Show Info'}</span>
                      </button>
                    </div>
                    <span className="text-neutral-400 text-[9px] md:text-[10px] tracking-[0.2em] font-bold uppercase truncate mt-0.5 md:mt-0 opacity-75">
                      {selectedShow.transcript.find(l => currentTime >= l.start && currentTime < l.end)?.speaker || selectedShow.host}
                    </span>
                  </div>

                  <div className="w-full flex items-center gap-2 md:gap-3">
                    <span className="font-mono text-[9px] md:text-[10px] text-neutral-500 font-bold w-8 md:w-10 text-right select-none">
                      {formatTime(currentTime)}
                    </span>
                    
                    <div className="h-0.5 md:h-1 flex-1 bg-white/10 rounded-full overflow-hidden relative group/timeline border border-white/[0.02]">
                      <input
                        type="range"
                        min="0"
                        max={selectedShow.duration}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 z-10 cursor-pointer w-full h-full"
                      />
                      <motion.div
                        className="h-full bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>

                    <span className="font-mono text-[9px] md:text-[10px] text-neutral-500 font-bold w-8 md:w-10 text-left select-none">
                      {formatTime(selectedShow.duration)}
                    </span>
                  </div>
                </div>

                {/* Extra Controls */}
                <div className="flex items-center gap-1.5 md:gap-3.5 shrink-0">
                  {/* Info toggle / button to expand or collapse details on mobile */}
                  <button
                    onClick={() => setMobileDisclaimerExpanded(!mobileDisclaimerExpanded)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border md:hidden ${
                      mobileDisclaimerExpanded 
                        ? 'bg-io-blue/20 text-io-blue border-io-blue/30' 
                        : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                    title={mobileDisclaimerExpanded ? 'Hide Info' : 'Show Info'}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {isSharingEnabled && (
                    <button
                      onClick={handleShare}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                      title="Share Radio Show Link"
                    >
                      <Share2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDownload(e, selectedShow)}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                    title="Download Show Bundle"
                  >
                    <Download className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsVideoExportModalOpen(true)}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/35 hover:to-rose-500/35 flex items-center justify-center text-amber-300 hover:text-white transition-colors cursor-pointer border border-amber-500/30 shadow-sm"
                    title="🎬 動画として書き出し（Video Export）"
                  >
                    <Film className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-300" />
                  </button>
                  <div className="w-[1px] h-6 bg-white/5 mx-1 hidden md:block" />
                  <div className="flex items-center gap-2 hidden md:flex">
                    <Volume2 className="w-4 h-4 text-zinc-400/80" />
                    <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden relative group/vol cursor-pointer">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setVolume(v);
                          if (audioRef.current) audioRef.current.volume = v;
                        }}
                        className="absolute inset-0 opacity-0 z-10 cursor-pointer w-full h-full"
                      />
                      <div className="h-full bg-zinc-400 group-hover/vol:bg-white transition-colors rounded-r-full" style={{ width: `${volume * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHARING MODAL OVERLAY */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div 
            onClick={() => setIsShareModalOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-50 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-950/90 border border-white/10 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-x-hidden overflow-y-auto max-h-[85vh]"
            >
              {/* Corner ambient glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-io-blue/20 blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight text-white/90">Share Radio Show Link</h3>
                </div>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors text-xs font-bold px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 bg-white/5 cursor-pointer"
                >
                  Close
                </button>
              </div>

               {sharingInProgress ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full border border-io-blue/30 animate-[spin_3s_linear_infinite]" />
                    <Loader2 className="w-10 h-10 text-io-blue animate-spin" />
                    <div className="absolute inset-x-0 h-full flex items-center justify-center text-[10px] font-mono font-bold text-white/95">
                      {uploadProgress}%
                    </div>
                  </div>
                  <div className="text-center space-y-3 w-full max-w-xs mx-auto">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white/95">{uploadStatus}</p>
                      <p className="text-xs text-white/45">Uploading audio stream and cover canvas directly to GCS...</p>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-io-blue transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : shareUrl ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs text-white/60 font-medium leading-relaxed">
                      Anyone with this customized link can fetch and stream this live radio show, browse the timecoded transcript context, or launch their own.
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Please note: this link will expire in 7 days.
                    </p>
                  </div>

                  <div className="flex gap-2 items-center bg-white/[0.03] border border-white/10 p-2 rounded-2xl">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareUrl}
                      className="flex-1 bg-transparent border-0 outline-none p-2 font-mono text-xs text-white/80 select-all"
                    />
                    <button
                      onClick={copyShareUrl}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${copySuccess ? 'bg-io-green text-black font-extrabold shadow-[0_0_15px_rgba(67,255,13,0.3)]' : 'bg-white text-black hover:bg-neutral-200'}`}
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs font-extrabold text-white transition-all uppercase tracking-wider cursor-pointer"
                    >
                      <span>Open Share link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-2 space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                    <div className="space-y-1 overflow-hidden w-full">
                      <p className="text-sm font-bold text-red-400">Failed to build shareable link</p>
                      <p className="text-xs text-red-200/85 leading-relaxed font-mono mt-1.5 break-words max-h-36 overflow-y-auto p-2 bg-black/40 rounded border border-white/5 scrollbar-thin">
                        {sharingError || "The sharing server could not save the file payload. Please try again or verify your connectivity."}
                      </p>
                    </div>
                  </div>

                  {sharingError && (sharingError.includes('storage.objects.create') || sharingError.includes('Permission') || sharingError.toLowerCase().includes('denied') || sharingError.includes('access') || sharingError.includes('gserviceaccount')) && (
                    <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex gap-2 items-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-io-blue/20 text-[10px] font-bold text-io-blue">ℹ</span>
                        <p className="text-xs font-bold text-white/90">GCS Permission Guide</p>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        To resolve this GCS permission error, grant write access on your GCS bucket to the AI Studio sandbox service account:
                      </p>
                      <div className="bg-black/60 p-2.5 rounded border border-white/5 font-mono text-[9px] text-zinc-300 break-all select-all flex justify-between items-center group/sa">
                        <span className="break-all">ais-sandbox@ais-us-east4-0a507bcc7a7b47959.iam.gserviceaccount.com</span>
                      </div>
                      <ol className="list-decimal list-inside text-[10px] text-white/50 space-y-1.5 leading-relaxed pl-1">
                        <li>Open the GCP Console &amp; select your bucket: <span className="font-mono text-zinc-300">process.env.GCS_BUCKET_NAME</span></li>
                        <li>Click on the <strong className="text-white/70">"Permissions"</strong> tab.</li>
                        <li>Click <strong className="text-white/70">"Grant Access"</strong> / <strong className="text-white/70">"Add Principal"</strong>.</li>
                        <li>Paste the service account email shown above.</li>
                        <li>Assign the role <strong className="text-white/70">"Storage Object Admin"</strong> (or <strong className="text-white/70">"Storage Object Creator"</strong>).</li>
                        <li>Click Save and click <strong className="text-white/70">"Retry Publishing"</strong> below.</li>
                      </ol>
                    </div>
                  )}

                  <button
                    onClick={handleShare}
                    className="w-full py-3 bg-white hover:bg-white/95 text-black font-bold uppercase tracking-wider text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Retry Publishing
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedShow.audioUrl ? (
        <audio
          ref={audioRef}
          src={selectedShow.audioUrl}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current && audioRef.current.duration) {
              const dur = Math.ceil(audioRef.current.duration);
              setSelectedShow(prev => (prev ? { ...prev, duration: dur } : prev));
            }
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      ) : null}

      {/* Video Export Modal */}
      <VideoExportModal
        isOpen={isVideoExportModalOpen}
        onClose={() => setIsVideoExportModalOpen(false)}
        show={selectedShow}
        initialAspectRatio={selectedShow.videoAspectRatio || '16:9'}
      />

      {/* 🌸 Irodori-TTS Integration Modal */}
      <IrodoriTtsModal
        isOpen={isIrodoriModalOpen}
        onClose={() => setIsIrodoriModalOpen(false)}
        enabled={irodoriEnabled}
        onToggleEnabled={(val) => {
          setIrodoriEnabled(val);
          if (typeof window !== 'undefined') {
            localStorage.setItem('irodori_enabled', String(val));
          }
        }}
        serverUrl={irodoriServerUrl}
        onServerUrlChange={(url) => {
          setIrodoriServerUrl(url);
          if (typeof window !== 'undefined') {
            localStorage.setItem('irodori_server_url', url);
          }
        }}
        apiKey={irodoriApiKey}
        onApiKeyChange={(key) => {
          setIrodoriApiKey(key);
          if (typeof window !== 'undefined') {
            localStorage.setItem('irodori_api_key', key);
          }
        }}
        styleEmoji={irodoriStyleEmoji}
        onStyleEmojiChange={setIrodoriStyleEmoji}
        promptAudioName={irodoriPromptAudioName}
        promptAudioBase64={irodoriPromptAudioBase64}
        onPromptAudioChange={(name, base64) => {
          setIrodoriPromptAudioName(name);
          setIrodoriPromptAudioBase64(base64);
        }}
      />



      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite alternate;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animation-delay-6000 { animation-delay: 6s; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        input[type='range'] {
          -webkit-appearance: none;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4285f4;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(66, 133, 244, 0.7);
        }
      `}} />
    </div>
  );
}
