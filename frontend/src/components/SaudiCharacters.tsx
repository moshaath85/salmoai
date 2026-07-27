import { useEffect, useState } from 'react';

interface SaudiCharactersProps {
  mini?: boolean;
}

const SaudiCharacters = ({ mini = false }: SaudiCharactersProps) => {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const mouthInterval = setInterval(() => {
      setMouthOpen(true);
      setTimeout(() => setMouthOpen(false), 600);
    }, 3200);
    return () => clearInterval(mouthInterval);
  }, []);

  const eyeHeight = blink ? 0.5 : 3.5;
  const scale = mini ? 0.65 : 1;

  return (
    <div
      className="flex items-end justify-center gap-6 sm:gap-10"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center bottom' }}
    >
      {/* Male Character - Thobe & Shemagh */}
      <div className="saudi-char-float-1 relative">
        {/* AI Glow */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/20 blur-xl" />
        <svg
          width="140"
          height="220"
          viewBox="0 0 140 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <defs>
            {/* Red/white checkered shemagh pattern */}
            <pattern id="shemaghPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#ffffff" />
              <rect x="0" y="0" width="3" height="3" fill="#c41e3a" opacity="0.85" />
              <rect x="3" y="3" width="3" height="3" fill="#c41e3a" opacity="0.85" />
              <rect x="1" y="1" width="1" height="1" fill="#ffffff" opacity="0.3" />
              <rect x="4" y="4" width="1" height="1" fill="#ffffff" opacity="0.3" />
            </pattern>
            {/* Finer overlay pattern for realism */}
            <pattern id="shemaghOverlay" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="12" y2="12" stroke="#c41e3a" strokeWidth="0.5" opacity="0.3" />
              <line x1="12" y1="0" x2="0" y2="12" stroke="#c41e3a" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Shadow */}
          <ellipse cx="70" cy="215" rx="38" ry="5" fill="rgba(0,0,0,0.15)" />

          {/* Thobe (white robe) */}
          <path
            d="M42 95 L36 205 L104 205 L98 95 Z"
            fill="#f0f0f0"
            stroke="#e0e0e0"
            strokeWidth="0.5"
          />
          {/* Thobe collar */}
          <path
            d="M52 95 L70 106 L88 95"
            fill="none"
            stroke="#d4d4d4"
            strokeWidth="1"
          />
          {/* Thobe center line */}
          <line x1="70" y1="106" x2="70" y2="200" stroke="#e0e0e0" strokeWidth="0.5" />

          {/* Left sleeve */}
          <path
            d="M42 100 L20 145 L30 148 L48 110"
            fill="#f0f0f0"
            stroke="#e0e0e0"
            strokeWidth="0.5"
          />
          {/* Right sleeve - waving */}
          <g className="saudi-wave-hand">
            <path
              d="M98 100 L118 140 L108 143 L90 110"
              fill="#f0f0f0"
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
            {/* Right hand */}
            <ellipse cx="118" cy="138" rx="5.5" ry="5" fill="#d4a574" />
            {/* Fingers hint */}
            <path d="M115 134 L114 131" stroke="#c49564" strokeWidth="1" strokeLinecap="round" />
            <path d="M118 133 L118 130" stroke="#c49564" strokeWidth="1" strokeLinecap="round" />
            <path d="M121 134 L122 131" stroke="#c49564" strokeWidth="1" strokeLinecap="round" />
          </g>
          {/* Left hand */}
          <ellipse cx="20" cy="145" rx="5.5" ry="5" fill="#d4a574" />

          {/* Neck */}
          <rect x="60" y="75" width="20" height="22" rx="4" fill="#d4a574" />

          {/* Head */}
          <ellipse cx="70" cy="55" rx="25" ry="28" fill="#d4a574" />

          {/* Ghutrah (white base layer) */}
          <path
            d="M40 48 Q40 20 70 16 Q100 20 100 48 Q100 55 95 58 L70 60 L45 58 Q40 55 40 48Z"
            fill="#ffffff"
            stroke="#e8e8e8"
            strokeWidth="0.5"
          />

          {/* Shemagh with checkered pattern - main top */}
          <path
            d="M42 46 Q42 22 70 18 Q98 22 98 46 Q98 52 94 55 L70 57 L46 55 Q42 52 42 46Z"
            fill="url(#shemaghPattern)"
            stroke="#b8182e"
            strokeWidth="0.3"
          />
          {/* Pattern overlay for depth */}
          <path
            d="M42 46 Q42 22 70 18 Q98 22 98 46 Q98 52 94 55 L70 57 L46 55 Q42 52 42 46Z"
            fill="url(#shemaghOverlay)"
          />

          {/* Shemagh left drape with pattern */}
          <path d="M43 50 L35 82 L46 80 L48 54" fill="#ffffff" stroke="#e8e8e8" strokeWidth="0.3" />
          <path d="M43 50 L35 82 L46 80 L48 54" fill="url(#shemaghPattern)" opacity="0.9" />
          <path d="M43 50 L35 82 L46 80 L48 54" fill="url(#shemaghOverlay)" />

          {/* Shemagh right drape with pattern */}
          <path d="M97 50 L105 82 L94 80 L92 54" fill="#ffffff" stroke="#e8e8e8" strokeWidth="0.3" />
          <path d="M97 50 L105 82 L94 80 L92 54" fill="url(#shemaghPattern)" opacity="0.9" />
          <path d="M97 50 L105 82 L94 80 L92 54" fill="url(#shemaghOverlay)" />

          {/* Agal (black double cord) */}
          <ellipse cx="70" cy="38" rx="27" ry="4" fill="none" stroke="#111111" strokeWidth="3" />
          <ellipse cx="70" cy="38" rx="27" ry="4" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
          {/* Agal knot detail on side */}
          <circle cx="43" cy="40" r="2.5" fill="#111111" />
          <circle cx="43" cy="40" r="1.5" fill="#222222" />

          {/* Forehead visible between agal and face */}
          <path
            d="M48 42 Q70 38 92 42"
            fill="none"
            stroke="#d4a574"
            strokeWidth="0"
          />

          {/* Eyes */}
          <ellipse cx="58" cy="52" rx="3.5" ry={eyeHeight} fill="#2c1810" />
          <ellipse cx="82" cy="52" rx="3.5" ry={eyeHeight} fill="#2c1810" />
          {/* Iris detail */}
          {!blink && (
            <>
              <ellipse cx="58" cy="52" rx="2" ry="2" fill="#1a0f08" />
              <ellipse cx="82" cy="52" rx="2" ry="2" fill="#1a0f08" />
              {/* Eye shine */}
              <circle cx="59.5" cy="51" r="1.2" fill="white" opacity="0.85" />
              <circle cx="83.5" cy="51" r="1.2" fill="white" opacity="0.85" />
              <circle cx="57" cy="53" r="0.6" fill="white" opacity="0.4" />
              <circle cx="81" cy="53" r="0.6" fill="white" opacity="0.4" />
            </>
          )}

          {/* Eyebrows */}
          <path d="M53 47 Q58 44 63 47" stroke="#2c1810" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M77 47 Q82 44 87 47" stroke="#2c1810" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* Nose */}
          <path d="M70 54 L67 61 L70 62 L73 61" fill="none" stroke="#b8956a" strokeWidth="0.8" strokeLinecap="round" />

          {/* Mouth - animated */}
          {mouthOpen ? (
            <ellipse cx="70" cy="67" rx="5" ry="2.5" fill="#8b5e3c" opacity="0.6" />
          ) : (
            <path d="M62 66 Q70 72 78 66" fill="none" stroke="#8b5e3c" strokeWidth="1.3" strokeLinecap="round" />
          )}

          {/* Beard/stubble hint */}
          <path d="M55 68 Q70 80 85 68" fill="none" stroke="#3d2b1f" strokeWidth="0.8" opacity="0.25" />
          <path d="M58 70 Q70 78 82 70" fill="none" stroke="#3d2b1f" strokeWidth="0.5" opacity="0.2" />
        </svg>
      </div>

      {/* Female Character - Abaya & Hijab */}
      <div className="saudi-char-float-2 relative">
        {/* AI Glow */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
        <svg
          width="140"
          height="220"
          viewBox="0 0 140 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Shadow */}
          <ellipse cx="70" cy="215" rx="38" ry="5" fill="rgba(0,0,0,0.15)" />

          {/* Abaya (black robe) */}
          <path
            d="M36 90 L30 205 L110 205 L104 90 Z"
            fill="#1a1a2e"
            stroke="#2d2d44"
            strokeWidth="0.5"
          />
          {/* Abaya decoration - subtle gold trim */}
          <path d="M52 110 L52 200" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />
          <path d="M88 110 L88 200" stroke="#f59e0b" strokeWidth="0.6" opacity="0.3" />
          <path d="M42 155 L98 155" stroke="#f59e0b" strokeWidth="0.3" opacity="0.2" />
          {/* Abaya subtle embroidery */}
          <path d="M60 120 Q70 115 80 120" stroke="#f59e0b" strokeWidth="0.3" opacity="0.2" fill="none" />
          <path d="M58 130 Q70 125 82 130" stroke="#f59e0b" strokeWidth="0.3" opacity="0.15" fill="none" />

          {/* Left sleeve */}
          <path
            d="M36 98 L16 142 L26 145 L43 108"
            fill="#1a1a2e"
            stroke="#2d2d44"
            strokeWidth="0.5"
          />
          {/* Right sleeve */}
          <path
            d="M104 98 L124 142 L114 145 L97 108"
            fill="#1a1a2e"
            stroke="#2d2d44"
            strokeWidth="0.5"
          />
          {/* Hands */}
          <ellipse cx="16" cy="142" rx="5" ry="4.5" fill="#c4956a" />
          <ellipse cx="124" cy="142" rx="5" ry="4.5" fill="#c4956a" />

          {/* Neck area */}
          <rect x="60" y="75" width="20" height="16" rx="4" fill="#c4956a" />

          {/* Head */}
          <ellipse cx="70" cy="52" rx="24" ry="27" fill="#c4956a" />

          {/* Hijab */}
          <path
            d="M39 52 Q39 20 70 16 Q101 20 101 52 Q101 78 88 88 L70 90 L52 88 Q39 78 39 52Z"
            fill="#1a1a2e"
            stroke="#2d2d44"
            strokeWidth="0.5"
          />
          {/* Hijab inner frame around face */}
          <path
            d="M47 46 Q47 30 70 27 Q93 30 93 46 Q93 66 84 74 L70 76 L56 74 Q47 66 47 46Z"
            fill="#c4956a"
          />
          {/* Hijab drape */}
          <path d="M44 60 L34 90 L52 88" fill="#1a1a2e" stroke="#2d2d44" strokeWidth="0.3" />
          <path d="M96 60 L106 90 L88 88" fill="#1a1a2e" stroke="#2d2d44" strokeWidth="0.3" />
          {/* Hijab subtle sheen */}
          <path
            d="M50 30 Q70 22 90 30"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />

          {/* Eyes - slightly larger, feminine */}
          <ellipse cx="58" cy="50" rx="4" ry={eyeHeight * 1.15} fill="#2c1810" />
          <ellipse cx="82" cy="50" rx="4" ry={eyeHeight * 1.15} fill="#2c1810" />
          {/* Iris detail */}
          {!blink && (
            <>
              <ellipse cx="58" cy="50" rx="2.2" ry="2.2" fill="#1a0f08" />
              <ellipse cx="82" cy="50" rx="2.2" ry="2.2" fill="#1a0f08" />
              {/* Eye shine */}
              <circle cx="59.5" cy="49" r="1.3" fill="white" opacity="0.85" />
              <circle cx="83.5" cy="49" r="1.3" fill="white" opacity="0.85" />
              <circle cx="57" cy="51" r="0.6" fill="white" opacity="0.4" />
              <circle cx="81" cy="51" r="0.6" fill="white" opacity="0.4" />
            </>
          )}

          {/* Eyelashes */}
          <path d="M53 46 Q58 43 63 46" stroke="#2c1810" strokeWidth="0.9" fill="none" />
          <path d="M77 46 Q82 43 87 46" stroke="#2c1810" strokeWidth="0.9" fill="none" />
          {/* Lower lash line */}
          <path d="M55 53 Q58 54 61 53" stroke="#2c1810" strokeWidth="0.4" fill="none" opacity="0.5" />
          <path d="M79 53 Q82 54 85 53" stroke="#2c1810" strokeWidth="0.4" fill="none" opacity="0.5" />

          {/* Nose */}
          <path d="M70 52 L67 58 L70 59 L73 58" fill="none" stroke="#a8825a" strokeWidth="0.7" strokeLinecap="round" />

          {/* Mouth - animated */}
          {mouthOpen ? (
            <ellipse cx="70" cy="64" rx="4.5" ry="2" fill="#8b5e3c" opacity="0.5" />
          ) : (
            <path d="M63 63 Q70 68 77 63" fill="none" stroke="#8b5e3c" strokeWidth="1" strokeLinecap="round" />
          )}

          {/* Subtle blush */}
          <circle cx="52" cy="60" r="5" fill="#e8a0a0" opacity="0.15" />
          <circle cx="88" cy="60" r="5" fill="#e8a0a0" opacity="0.15" />
        </svg>
      </div>
    </div>
  );
};

export default SaudiCharacters;