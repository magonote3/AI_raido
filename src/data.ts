import { RadioShow, RawRadioShow } from './types';
import { DEFAULT_NEWS_THUMBNAIL_MINATO, DEFAULT_NEWS_THUMBNAIL_SALVATION, generateNewsArticleThumbnailSvg } from './utils/newsThumbnail';

function parseTimecode(time: string): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

function estimateSegmentDuration(text: string): number {
  if (!text) return 5;
  const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
  if (isJapanese) {
    // Natural broadcast cadence: ~3.3 characters per second + 1.8s breath/emphasis pause
    return Math.max(5, Math.ceil(text.length / 3.3) + 2);
  } else {
    // English: ~2.3 words per second + 1.5s pause
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(5, Math.ceil(words / 2.3) + 2);
  }
}

export function transformShow(raw: RawRadioShow): RadioShow {
  const REQUIRED_OPENING_SPEECH = "幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。ここにたどり着いたあなたへ ほんの少しのお手伝いを。";
  const REQUIRED_CLOSING_SPEECH = "詳しいお告げや毎日を損したくないと思ったあなたは、プロフィールのURLを見てくださいね。note・substack・mediumに詳しい内容がありますので、お暇でしたら一度遊びに来てくださいね。では、リスナーさんに今日も幸福共鳴の幸あれ。ミナトでした。";
  
  const UNWANTED_PHRASE_REGEX = /「?あら、そんなにお怯えになった顔しないで。?あなたの必死なあがき、実は結構楽しんでいるのよ。?壊れる寸前の魂ほど、美しく澄んだ数霊の音を響かせるものよ……ふふっ。?」?|"?My, do not look so terrified\. I am actually quite enjoying your desperate struggles\. Souls on the verge of breaking resonate with the purest tone of Kazutama\.\.\. fufu\.?"?/gi;

  const rawTranscript = (raw.timecoded_transcript || []).map((line) => ({
    ...line,
    text: (line.text || "").replace(UNWANTED_PHRASE_REGEX, "").replace(/\s{2,}/g, " ").trim(),
  }));
  if (rawTranscript.length > 0) {
    const firstLine = rawTranscript[0];
    if (!firstLine.text.includes("ミナトの共鳴の場へ") && !firstLine.text.includes("Place of Resonance")) {
      const cleanedFirst = firstLine.text
        .replace(/ようこそ。魂の共鳴へ。本日も、皆さんの魂が幸福と共鳴できますように。?/g, "")
        .trim();
      firstLine.text = `${REQUIRED_OPENING_SPEECH} ${cleanedFirst}`.trim();
    }

    const lastLine = rawTranscript[rawTranscript.length - 1];
    if (!lastLine.text.includes("プロフィールのURL") && !lastLine.text.includes("note・substack・medium")) {
      lastLine.text = `${lastLine.text.replace(/(お相手は|数霊師ミナトでした).*?$/, '').trim()} ${REQUIRED_CLOSING_SPEECH}`.trim();
    }
  }

  // Calculate progressive, natural timestamps so no sentence is cut off mid-speech
  let runningTime = 0;
  const transcript = rawTranscript.map((line) => {
    const estimatedDuration = estimateSegmentDuration(line.text);
    const start = runningTime;
    const end = start + estimatedDuration;
    runningTime = end;
    
    return {
      start,
      end,
      speaker: line.speaker,
      text: line.text,
    };
  });

  const calculatedTotalDuration = transcript.length > 0 ? transcript[transcript.length - 1].end : 180;
  const parsedRawDuration = parseTimecode(raw.show_duration || "03:00");
  const finalDuration = Math.max(calculatedTotalDuration, parsedRawDuration);

  const fallbackCover = raw.news_headline 
    ? generateNewsArticleThumbnailSvg({
        title: raw.show_title,
        headline: raw.news_headline,
        category: raw.news_category,
        catchphrase: raw.news_catchphrase,
        lossAversionHook: raw.loss_aversion_hook,
        anchoredMetric: raw.anchored_metric,
        luckyNumber: raw.lucky_number,
        bestSign: raw.best_sign,
        hostName: raw.timecoded_transcript?.[0]?.speaker || "数霊師ミナト",
      })
    : DEFAULT_NEWS_THUMBNAIL_MINATO;

  // Keep valid synthesized audio (data URLs or remote audio), only filter out placeholder starter audio
  const isStarterAudio = raw.audioUrl?.includes('starter-apps');
  const validAudioUrl = raw.audioUrl && !isStarterAudio ? raw.audioUrl : "";

  return {
    title: raw.show_title,
    duration: finalDuration,
    summary: raw.two_sentence_summary,
    date: raw.date_of_generation,
    host: raw.timecoded_transcript?.[0]?.speaker || "数霊師ミナト",
    coverImage: raw.coverImage || fallbackCover,
    audioUrl: validAudioUrl,
    notesUrl: raw.notesUrl,
    transcript,
    newsHeadline: raw.news_headline,
    newsCategory: raw.news_category,
    newsCatchphrase: raw.news_catchphrase,
    lossAversionHook: raw.loss_aversion_hook,
    curiosityGap: raw.curiosity_gap,
    anchoredMetric: raw.anchored_metric,
    luckyNumber: raw.lucky_number,
    luckyItem: raw.lucky_item,
    luckyColor: raw.lucky_color,
    bestSign: raw.best_sign,
    mediaMode: raw.media_mode || 'radio',
    videoAspectRatio: raw.video_aspect_ratio || '16:9',
    videoStyle: raw.video_style || 'breaking_news',
    voicePresetId: raw.voice_preset_id || 'official_alluring',
    voicePresetName: raw.voice_preset_name || '妖美と深淵（公式サンプルボイス）',
    voicePresetDesc: raw.voice_preset_desc || '',
    voiceSampleText: raw.voice_sample_text || '',
    voiceSampleUrl: raw.voice_sample_url || '',
    voicePitch: raw.voice_pitch ?? 0.98,
    voiceRate: raw.voice_rate ?? 0.92,
    geminiVoice: raw.gemini_voice || 'Kore',
  };
}

export const RAW_FORTUNE_SHOW_MINATO: RawRadioShow = {
  "show_title": "数霊師ミナトの数霊ラジオ 〜12星座の共鳴ランキング＆聞かないと損する開運アクション〜",
  "show_duration": "03:45",
  "two_sentence_summary": "妖美なる数霊師ミナトが古代数霊術と星々の運行から本日の運命共鳴を解読。哀れに足掻くリスナーの魂を甘美な言葉と救済解析データで好転へ導く本格トークラジオ。",
  "date_of_generation": "2026-10-11",
  "coverImage": DEFAULT_NEWS_THUMBNAIL_MINATO,
  "audioUrl": "https://www.gstatic.com/aistudio/starter-apps/assets/ai_radio/ai_radio.mp3",
  "news_headline": "【緊急特報】知らずに過ごすと9割損する…12星座の数霊共鳴ランキング流出",
  "news_category": "BREAKING SCOOP / 特命告発",
  "news_catchphrase": "数霊師ミナトが暴露する『栄光の第1位』とお怯えの救済プロトコル",
  "loss_aversion_hook": "損失回避警告: 本日の波長8を逃すと運気激変チャンスが消滅します",
  "anchored_metric": "共鳴的中率 89.4%",
  "lucky_number": "8",
  "best_sign": "おひつじ座",
  "timecoded_transcript": [
    {
      "timecode": "00:00",
      "speaker": "数霊師ミナト",
      "text": "幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。ここにたどり着いたあなたへ ほんの少しのお手伝いを。数霊師ミナトの数霊ラジオ、今宵も運命の暗号を解き明かしてあげるわ。"
    },
    {
      "timecode": "00:20",
      "speaker": "数霊師ミナト",
      "text": "本日のフォーマットは『12星座の共鳴ランキング』。後半には、聞かないと損する開運アクションと、迷える仔羊のための運命救済解析データを用意しているのよ。"
    },
    {
      "timecode": "00:40",
      "speaker": "数霊師ミナト",
      "text": "本日、最も甘美な第9波長と完全共鳴している栄えある第1位は……おひつじ座のあなた。数霊ナンバーは『8』。無限の可能性と果実が実る最高調の波動よ。存分にその力を振るいなさい。"
    },
    {
      "timecode": "01:05",
      "speaker": "数霊師ミナト",
      "text": "あら……生電話がつながっているわね。新規事業の重圧に怯えているおひつじ座のケンジ。さあ、私にあなたの怯えを聞かせてごらんなさい。"
    },
    {
      "timecode": "01:22",
      "speaker": "リスナー(ケンジ)",
      "text": "ミナト先生……抜擢されたのですが、失敗したらと思うと重責に押し潰されそうで怖くて足がすくんでいます…"
    },
    {
      "timecode": "01:38",
      "speaker": "数霊師ミナト",
      "text": "ふふっ、その震える声、とても愛おしいわ。でも安心して。あなたの本命数と今日の宇宙波動は完全合致しているの。怯えはただの脱皮の証拠よ。救済解析データは【即答・受諾】を告げているわ。飛び込みなさい。"
    },
    {
      "timecode": "02:05",
      "speaker": "リスナー(ケンジ)",
      "text": "ミナト先生の言葉を聞いて、鳥肌が立ちました……逃げずに受けて立ちます！"
    },
    {
      "timecode": "02:20",
      "speaker": "数霊師ミナト",
      "text": "良い返事ね。さて、聞かないと損する本日の開運アクションは『シルバーのペンで手のひらに数字の8を一度だけ描くこと』。金運と対人の磁場が一気にあなたへ味方するわ。"
    },
    {
      "timecode": "02:48",
      "speaker": "数霊師ミナト",
      "text": "運命とは確定された未来ではなく、あなたの意識の周波数で紡ぎ直されるもの……足掻くことをやめないでね、ふふっ。詳しいお告げや毎日を損したくないと思ったあなたは、プロフィールのURLを見てくださいね。note・substack・mediumに詳しい内容がありますので、お暇でしたら一度遊びに来てくださいね。では、リスナーさんに今日も幸福共鳴の幸あれ。ミナトでした。"
    }
  ]
};

export const RAW_FORTUNE_SHOW_SALVATION: RawRadioShow = {
  "show_title": "数霊師ミナトの数霊ラジオ 〜運命の救済解析データ＆生電話スペシャル〜",
  "show_duration": "03:30",
  "two_sentence_summary": "魂の暗号を解読する数霊師ミナトが、運気の滞りを感じるリスナーへ緊急の救済解析データを提示。聞かないと損する秘伝の開運アクションで人生の好転劇を後押しします。",
  "date_of_generation": "2026-10-10",
  "coverImage": DEFAULT_NEWS_THUMBNAIL_SALVATION,
  "audioUrl": "https://www.gstatic.com/aistudio/starter-apps/assets/ai_radio/ai_radio.mp3",
  "news_headline": "【独自取材】壊れかけた運命を反転させる『運命の救済解析データ』極秘公開",
  "news_category": "EXCLUSIVE SCOOP / 運命救済特報",
  "news_catchphrase": "生電話で明かされたカルマ逆転の真理…数霊師ミナトが授ける開運アクション",
  "loss_aversion_hook": "重大警告: 放置すると泥沼化する人間関係の波動を3秒で解毒せよ",
  "anchored_metric": "魂の救済スコア 98.2%",
  "lucky_number": "1",
  "best_sign": "全星座対象",
  "timecoded_transcript": [
    {
      "timecode": "00:00",
      "speaker": "数霊師ミナト",
      "text": "幸福を見つけたいアナタ。幸せを逃したくないアナタ。ここは、幸福の共鳴を求める探究者たちの憩いの場。ようこそ ミナトの共鳴の場へ。ここにたどり着いたあなたへ ほんの少しのお手伝いを。見えない数の調べが、迷える魂を救済の光へと導きます。数霊師ミナトの運命救済解析レディオ、開演です。"
    },
    {
      "timecode": "00:22",
      "speaker": "数霊師ミナト",
      "text": "今夜は特別編『運命の救済解析データ』。日常の選択やカルマの重さに悩む方のために、数の霊力を用いた解析セッションをダイレクトにお届けします。"
    },
    {
      "timecode": "00:45",
      "speaker": "数霊師ミナト",
      "text": "お便りをいただいています。人間関係の摩擦に悩むアヤカさん。数霊解析によれば、相手は鏡の数霊。怒りを手放し、感謝を1回唱えることで関係の磁場が逆転します。"
    },
    {
      "timecode": "01:15",
      "speaker": "数霊師ミナト",
      "text": "さらに、本日の聞かないと損する開運アクションは『東の方角を向いて深呼吸し、白湯を口に含むこと』。滞ったエネルギーが綺麗に浄化されます。"
    },
    {
      "timecode": "01:45",
      "speaker": "数霊師ミナト",
      "text": "あなたの人生には、常に大いなる数の加護があります。迷った時は心の静寂へ帰ってください。詳しいお告げや毎日を損したくないと思ったあなたは、プロフィールのURLを見てくださいね。note・substack・mediumに詳しい内容がありますので、お暇でしたら一度遊びに来てくださいね。では、リスナーさんに今日も幸福共鳴の幸あれ。ミナトでした。"
    }
  ]
};

export const RAW_MOCK_SHOW: RawRadioShow = RAW_FORTUNE_SHOW_MINATO;

export const MOCK_SHOW: RadioShow = transformShow(RAW_FORTUNE_SHOW_MINATO);
export const MOCK_SHOW_2: RadioShow = transformShow(RAW_FORTUNE_SHOW_SALVATION);
