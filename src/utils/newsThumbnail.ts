/**
 * Utility to generate HD (16:9 - 1280x720) News Article Style Thumbnails
 * Powered by Neuromarketing and Behavioral Economics Principles:
 * - Loss Aversion (損失回避): "知らずに過ごすと9割損する..."
 * - Curiosity Gap (好奇心の空白): "なぜあの星座だけが選ばれたのか？"
 * - Social Proof & Authority (社会的証明・権威性): "数万人鑑定の数霊師ミナト独占特報"
 * - Anchoring & Specificity (アンカリング・具体的数値): "的中率89.4% / わずか3秒のアクション"
 * - Urgency & Scarcity (緊迫感・希少性): "【緊急速報 / BREAKING SCOOP】"
 */

export interface NewsThumbnailParams {
  title?: string;
  headline?: string;
  category?: string;
  catchphrase?: string;
  lossAversionHook?: string;
  curiosityGap?: string;
  anchoredMetric?: string;
  hostName?: string;
  luckyNumber?: string;
  bestSign?: string;
  dateStr?: string;
}

export function generateNewsArticleThumbnailSvg(params: NewsThumbnailParams): string {
  const host = params.hostName || "数霊師ミナト";
  const headline = (params.headline || "【緊急特報】知らずに過ごすと9割損する…運命の数霊反転データ流出").trim();
  const category = (params.category || "BREAKING SCOOP / 緊急特報").trim();
  const catchphrase = (params.catchphrase || "数霊師ミナトが暴く『今日実行しないと運気が半減する3大兆候』").trim();
  const metric = (params.anchoredMetric || "共鳴的中率 89.4%").trim();
  const lossAversion = (params.lossAversionHook || "損失回避警告: 今日の波長を見逃すと次の転換期は数年後…").trim();
  const luckyNum = params.luckyNumber || "8";
  const bestSign = params.bestSign || "おひつじ座";

  // Clean XML special chars helper
  const escapeXml = (str: string) => 
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // Adaptive Headline Layout:
  // Safe zone for text on left side is width 640px (x: 60 to 700, mandala starts around x: 740)
  // Short (<=18 chars): 1 line at 38px
  // Medium (19-34 chars): 2 lines at 30px (each max 17 chars)
  // Long (>34 chars): 2-3 lines at 25px (each max 19 chars)
  let headlineLines: string[] = [];
  let headlineFontSize = 32;
  let headlineLineHeight = 44;

  if (headline.length <= 18) {
    headlineLines = [headline];
    headlineFontSize = 38;
    headlineLineHeight = 50;
  } else if (headline.length <= 34) {
    const charsPerLine = Math.ceil(headline.length / 2);
    headlineLines = [
      headline.slice(0, charsPerLine),
      headline.slice(charsPerLine)
    ];
    headlineFontSize = 31;
    headlineLineHeight = 42;
  } else {
    // 3 lines layout
    headlineFontSize = 25;
    headlineLineHeight = 35;
    const l1Limit = 18;
    const l2Limit = 18;
    headlineLines.push(headline.slice(0, l1Limit));
    if (headline.length > l1Limit) {
      headlineLines.push(headline.slice(l1Limit, l1Limit + l2Limit));
    }
    if (headline.length > l1Limit + l2Limit) {
      const rest = headline.slice(l1Limit + l2Limit, l1Limit + l2Limit + 17);
      headlineLines.push(headline.length > l1Limit + l2Limit + 17 ? rest + "…" : rest);
    }
  }

  // Catchphrase adaptive 1 or 2 lines
  let catchphraseLines: string[] = [];
  if (catchphrase.length <= 30) {
    catchphraseLines = [catchphrase];
  } else {
    catchphraseLines = [
      catchphrase.slice(0, 28),
      catchphrase.length > 28 ? (catchphrase.length > 56 ? catchphrase.slice(28, 54) + "…" : catchphrase.slice(28)) : ""
    ].filter(Boolean);
  }

  // Loss aversion safe truncation
  const safeLossAversion = lossAversion.length > 44 ? lossAversion.slice(0, 43) + "…" : lossAversion;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgGrad" cx="72%" cy="30%" r="85%" fx="62%" fy="25%">
      <stop offset="0%" stop-color="#2a0d45" />
      <stop offset="35%" stop-color="#140628" />
      <stop offset="70%" stop-color="#080212" />
      <stop offset="100%" stop-color="#020005" />
    </radialGradient>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#d97706" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="breakingRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="50%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
    <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <linearGradient id="blueBanner" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.85" />
    </filter>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Deep Cosmic Broadcast Background -->
  <rect width="1280" height="720" fill="url(#bgGrad)" />

  <!-- Studio Coordinate Grid & Scanline Aesthetic -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="80" x2="1280" y2="80" />
    <line x1="0" y1="640" x2="1280" y2="640" />
    <line x1="120" y1="0" x2="120" y2="720" />
    <line x1="960" y1="0" x2="960" y2="720" />
    <circle cx="1000" cy="360" r="180" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 6" />
    <circle cx="1000" cy="360" r="260" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4 8" />
  </g>

  <!-- Mystical Sacred Geometry Mandala & Floating Numerology Runes -->
  <g transform="translate(1000, 360)">
    <!-- Ambient Gold Glow -->
    <circle cx="0" cy="0" r="230" fill="url(#goldGlow)" />
    
    <!-- Outer Sacred Numerology Rings -->
    <circle cx="0" cy="0" r="190" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.5" />
    <circle cx="0" cy="0" r="150" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.7" stroke-dasharray="10 5" />
    <circle cx="0" cy="0" r="110" fill="none" stroke="#e0e7ff" stroke-width="1" opacity="0.4" />
    
    <!-- 12-Star Constellation Points -->
    <polygon points="0,-170 43,-47 161,-52 72,24 106,137 0,76 -106,137 -72,24 -161,-52 -43,-47" 
      fill="none" stroke="#fbbf24" stroke-width="1.5" opacity="0.4" />
    <polygon points="0,170 -43,47 -161,52 -72,-24 -106,-137 0,-76 106,-137 72,-24 161,52 43,47" 
      fill="none" stroke="#f43f5e" stroke-width="1" opacity="0.3" />

    <!-- Central Glowing Core Number -->
    <circle cx="0" cy="0" r="70" fill="#090314" stroke="#fbbf24" stroke-width="3" filter="url(#neonGlow)" />
    <text x="0" y="22" font-family="'Helvetica Neue', 'Arial', sans-serif" font-size="64" font-weight="900" fill="url(#goldTextGrad)" text-anchor="middle" filter="url(#dropShadow)">${escapeXml(luckyNum)}</text>
    <text x="0" y="48" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="11" font-weight="700" fill="#fef08a" text-anchor="middle" letter-spacing="3">数霊波動核</text>

    <!-- Orbiting Zodiac & Number Accents -->
    <text x="-115" y="-115" font-family="'Helvetica Neue', sans-serif" font-size="26" font-weight="800" fill="#fbbf24" opacity="0.8">3</text>
    <text x="120" y="-75" font-family="'Helvetica Neue', sans-serif" font-size="30" font-weight="800" fill="#38bdf8" opacity="0.8">7</text>
    <text x="105" y="130" font-family="'Helvetica Neue', sans-serif" font-size="26" font-weight="800" fill="#f43f5e" opacity="0.8">9</text>
    <text x="-120" y="105" font-family="'Helvetica Neue', sans-serif" font-size="24" font-weight="800" fill="#a855f7" opacity="0.7">1</text>
    
    <!-- Sign label badge in circle -->
    <rect x="-65" y="85" width="130" height="26" rx="13" fill="#dc2626" opacity="0.9" filter="url(#dropShadow)" />
    <text x="0" y="102" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">共鳴1位: ${escapeXml(bestSign)}</text>
  </g>

  <!-- Dark Broadcast Vignette on Left Side for Typography -->
  <rect x="0" y="0" width="750" height="720" fill="url(#blueBanner)" opacity="0.75" />
  <rect x="0" y="0" width="1280" height="720" fill="black" opacity="0.12" />

  <!-- TOP HEADER / BROADCAST BAR -->
  <g transform="translate(60, 48)">
    <!-- Red Breaking Scoop Pill -->
    <rect x="0" y="0" width="220" height="34" rx="6" fill="url(#breakingRed)" filter="url(#dropShadow)" />
    <circle cx="18" cy="17" r="5" fill="#ffffff" />
    <text x="32" y="23" font-family="'Helvetica Neue', 'Arial Black', sans-serif" font-size="13" font-weight="900" fill="#ffffff" letter-spacing="1">● ${escapeXml(category)}</text>

    <!-- Anchored Metric Pill -->
    <rect x="235" y="0" width="180" height="34" rx="6" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5" />
    <text x="250" y="22" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="12" font-weight="800" fill="#a5b4fc">📊 ${escapeXml(metric)}</text>

    <!-- HD Broadcast Spec Badge (Right Side) -->
    <g transform="translate(1040, 0)">
      <rect x="0" y="0" width="130" height="34" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="14" y="22" font-family="'Helvetica Neue', sans-serif" font-size="11" font-weight="900" fill="#38bdf8" letter-spacing="1.5">4K HD SCOOP</text>
    </g>
  </g>

  <!-- AUTHORITY BYLINE / PROGRAM BRANDING -->
  <g transform="translate(60, 125)">
    <text x="0" y="0" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="13.5" font-weight="800" fill="#f59e0b" letter-spacing="1.5">
      【独占解析】妖美なる運命鑑定家・${escapeXml(host)} 特命リポート
    </text>
    <line x1="0" y1="10" x2="440" y2="10" stroke="#f59e0b" stroke-width="2" opacity="0.6" />
  </g>

  <!-- LOSS AVERSION HOOK (損失回避トリガー: 赤・黄色の警告帯) -->
  <g transform="translate(60, 165)">
    <rect x="0" y="0" width="650" height="32" rx="4" fill="#450a0a" stroke="#ef4444" stroke-width="1.5" />
    <text x="14" y="21" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="12" font-weight="900" fill="#fca5a5" letter-spacing="0.5">
      ⚠️ ${escapeXml(safeLossAversion)}
    </text>
  </g>

  <!-- GIANT SENSATIONAL NEWS HEADLINE (適応型マルチライン・見切れ完全防止) -->
  <g transform="translate(60, 255)" filter="url(#dropShadow)">
    ${headlineLines.map((line, idx) => {
      const y = idx * headlineLineHeight;
      const color = idx === 0 ? "#ffffff" : "url(#goldTextGrad)";
      return `<text x="0" y="${y}" font-family="'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif" font-size="${headlineFontSize}" font-weight="900" fill="${color}" letter-spacing="-0.5">${escapeXml(line)}</text>`;
    }).join('\n    ')}
  </g>

  <!-- SUB-HEADLINE / CURIOSITY GAP (内包テキストの折り返し対応) -->
  <g transform="translate(60, 420)">
    <rect x="0" y="0" width="650" height="${catchphraseLines.length > 1 ? 62 : 46}" rx="8" fill="#0f172a" opacity="0.9" stroke="#38bdf8" stroke-width="1" />
    ${catchphraseLines.map((cl, cIdx) => {
      const cy = catchphraseLines.length > 1 ? (cIdx === 0 ? 26 : 48) : 29;
      const prefix = cIdx === 0 ? "🔍 " : "   ";
      return `<text x="16" y="${cy}" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="13.5" font-weight="800" fill="#e2e8f0" letter-spacing="0.3">${prefix}${escapeXml(cl)}</text>`;
    }).join('\n    ')}
  </g>

  <!-- PSYCHOLOGICAL ACTION BADGES -->
  <g transform="translate(60, 510)">
    <!-- Badge 1: 損失回避 -->
    <rect x="0" y="0" width="180" height="34" rx="17" fill="#7f1d1d" stroke="#f87171" stroke-width="1" />
    <text x="90" y="22" font-family="'Hiragino Sans', sans-serif" font-size="11.5" font-weight="800" fill="#fecaca" text-anchor="middle">⚡ 損失回避・緊急指示</text>

    <!-- Badge 2: 好奇心GAP -->
    <rect x="195" y="0" width="180" height="34" rx="17" fill="#1e1b4b" stroke="#818cf8" stroke-width="1" />
    <text x="285" y="22" font-family="'Hiragino Sans', sans-serif" font-size="11.5" font-weight="800" fill="#c7d2fe" text-anchor="middle">🗝️ 禁断の数霊真実</text>

    <!-- Badge 3: 救済プロトコル -->
    <rect x="390" y="0" width="180" height="34" rx="17" fill="#064e3b" stroke="#34d399" stroke-width="1" />
    <text x="480" y="22" font-family="'Hiragino Sans', sans-serif" font-size="11.5" font-weight="800" fill="#a7f3d0" text-anchor="middle">✨ 即効好転アクション</text>
  </g>

  <!-- BOTTOM TICKER & CALL-TO-ACTION (文字とボタンの衝突防止) -->
  <g transform="translate(0, 650)">
    <!-- Ticker Background -->
    <rect x="0" y="0" width="1280" height="70" fill="#020617" />
    <line x1="0" y1="0" x2="1280" y2="0" stroke="#f59e0b" stroke-width="2" />

    <!-- Left Ticker Tag -->
    <rect x="60" y="16" width="120" height="38" rx="4" fill="#dc2626" />
    <text x="120" y="40" font-family="'Helvetica Neue', sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">LIVE SCOOP</text>

    <!-- Scrolling-style text with safe right clearance -->
    <text x="195" y="40" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="13.5" font-weight="700" fill="#cbd5e1">
      【緊急速報】数霊師ミナトの数霊ラジオ緊急配信中 / 本日限りの数霊救済プロトコルを今すぐ再生して真相を確認せよ
    </text>

    <!-- Big Play CTA Button on Bottom Right -->
    <g transform="translate(1080, 14)" filter="url(#dropShadow)">
      <rect x="0" y="0" width="160" height="42" rx="21" fill="url(#goldTextGrad)" />
      <polygon points="24,14 24,28 36,21" fill="#000000" />
      <text x="46" y="27" font-family="'Hiragino Sans', 'Noto Sans JP', sans-serif" font-size="13.5" font-weight="900" fill="#000000" letter-spacing="1">今すぐ聴く ▶</text>
    </g>
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// High definition pre-generated news thumbnails for default shows
export const DEFAULT_NEWS_THUMBNAIL_MINATO = generateNewsArticleThumbnailSvg({
  headline: "【緊急特報】知らずに過ごすと9割損する…12星座の数霊共鳴ランキング流出",
  category: "BREAKING SCOOP / 特命告発",
  catchphrase: "数霊師ミナトが暴露する『栄光の第1位』とお怯えの救済プロトコル",
  lossAversionHook: "損失回避警告: 本日の波長8を逃すと運気激変チャンスが消滅します",
  anchoredMetric: "共鳴的中率 89.4%",
  luckyNumber: "8",
  bestSign: "おひつじ座",
});

export const DEFAULT_NEWS_THUMBNAIL_SALVATION = generateNewsArticleThumbnailSvg({
  headline: "【独自取材】壊れかけた運命を反転させる『運命の救済解析データ』極秘公開",
  category: "EXCLUSIVE SCOOP / 運命救済特報",
  catchphrase: "生電話で明かされたカルマ逆転の真理…数霊師ミナトが授ける開運アクション",
  lossAversionHook: "重大警告: 放置すると泥沼化する人間関係の波動を3秒で解毒せよ",
  anchoredMetric: "魂の救済スコア 98.2%",
  luckyNumber: "1",
  bestSign: "全星座対象",
});
