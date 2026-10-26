export interface RawTranscriptLine {
  timecode: string; // "MM:SS"
  speaker: string;
  text: string;
}

export interface RawRadioShow {
  show_title: string;
  show_duration: string; // "MM:SS"
  two_sentence_summary: string;
  date_of_generation: string;
  timecoded_transcript: RawTranscriptLine[];
  coverImage?: string; // Added for UI
  audioUrl?: string;   // Added for playback
  notesUrl?: string;   // Added for downloading show notes
  news_headline?: string;
  news_category?: string;
  news_catchphrase?: string;
  loss_aversion_hook?: string;
  curiosity_gap?: string;
  anchored_metric?: string;
  lucky_number?: string;
  lucky_item?: string;
  lucky_color?: string;
  best_sign?: string;
  media_mode?: 'radio' | 'video' | 'script';
  video_aspect_ratio?: '16:9' | '9:16' | '1:1';
  video_style?: string;
  voice_preset_id?: string;
  voice_preset_name?: string;
  voice_preset_desc?: string;
  voice_sample_text?: string;
  voice_sample_url?: string;
  voice_pitch?: number;
  voice_rate?: number;
  gemini_voice?: string;
}

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface RadioShow {
  title: string;
  duration: number;
  summary: string;
  date: string;
  host: string;
  coverImage: string;
  audioUrl: string;
  notesUrl?: string;
  transcript: TranscriptLine[];
  shareId?: string;
  shareUrl?: string;
  isUserGenerated?: boolean;
  newsHeadline?: string;
  newsCategory?: string;
  newsCatchphrase?: string;
  lossAversionHook?: string;
  curiosityGap?: string;
  anchoredMetric?: string;
  luckyNumber?: string;
  luckyItem?: string;
  luckyColor?: string;
  bestSign?: string;
  mediaMode?: 'radio' | 'video' | 'script';
  videoAspectRatio?: '16:9' | '9:16' | '1:1';
  videoStyle?: string;
  voicePresetId?: string;
  voicePresetName?: string;
  voicePresetDesc?: string;
  voiceSampleText?: string;
  voiceSampleUrl?: string;
  voicePitch?: number;
  voiceRate?: number;
  geminiVoice?: string;
}
