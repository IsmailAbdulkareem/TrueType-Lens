export interface SampleImage {
  id: string;
  title: string;
  category: string;
  description: string;
  // Pre-configured text annotations for instant demonstration
  presetTexts: Array<{
    id: string;
    text: string;
    suggestedNewText: string;
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
    fontFamily: string;
    fontWeight: string;
    fontStyle?: 'normal' | 'italic';
    color: string;
    outlineColor?: string;
    outlineWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
    backgroundColor: string;
    rotationAngle?: number;
    blendMode?: string;
    cameraBlur?: number;
    filmGrain?: number;
    letterSpacing?: number;
  }>;
  // Generate sample image SVG data URI
  generateSvgDataUri: () => string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'cafe-chalkboard',
    title: 'Cafe Chalkboard Sign',
    category: 'Signage & Hospitality',
    description: 'Rustic cafe chalkboard with chalk dust texture and handwritten style font',
    presetTexts: [
      {
        id: 'sample-cafe-1',
        text: 'ORGANIC COLD BREW',
        suggestedNewText: 'SPECIAL MATCHA LATTE',
        box_2d: [340, 160, 440, 840],
        fontFamily: 'Caveat',
        fontWeight: '700',
        color: '#EAE6D9',
        shadowColor: '#2B2B28',
        shadowBlur: 3,
        backgroundColor: '#1E2421',
        rotationAngle: -1.5,
        blendMode: 'source-over',
        cameraBlur: 0.5,
        filmGrain: 12,
        letterSpacing: 2,
      },
      {
        id: 'sample-cafe-2',
        text: '$4.75',
        suggestedNewText: '$5.50',
        box_2d: [480, 380, 580, 620],
        fontFamily: 'Montserrat',
        fontWeight: '800',
        color: '#F4D06F',
        shadowColor: '#1A1C18',
        shadowBlur: 2,
        backgroundColor: '#1E2421',
        rotationAngle: 0,
        blendMode: 'source-over',
        cameraBlur: 0.4,
        filmGrain: 10,
        letterSpacing: 1,
      },
    ],
    generateSvgDataUri: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750">
        <defs>
          <filter id="chalk-texture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="0.1 0 0 0 0.1  0 0.12 0 0 0.12  0 0 0.1 0 0.1  0 0 0 0.6 0" />
            <feComposite in2="SourceGraphic" in="gl" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
          <radialGradient id="chalk-bg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#28332E"/>
            <stop offset="70%" stop-color="#1B2320"/>
            <stop offset="100%" stop-color="#121816"/>
          </radialGradient>
        </defs>
        <!-- Wood Frame -->
        <rect width="1000" height="750" fill="#3D2314"/>
        <rect x="25" y="25" width="950" height="700" fill="#4E2E1B" stroke="#221208" stroke-width="6"/>
        <!-- Chalkboard Slate -->
        <rect x="50" y="50" width="900" height="650" fill="url(#chalk-bg)" />
        <!-- Subtle Chalk Dust Stains -->
        <circle cx="500" cy="380" r="280" fill="#FFFFFF" opacity="0.04" filter="blur(40px)"/>
        <circle cx="300" cy="200" r="160" fill="#D4DFD8" opacity="0.03" filter="blur(30px)"/>
        <!-- Chalkboard Border Lines -->
        <rect x="75" y="75" width="850" height="600" fill="none" stroke="#D1DDD5" stroke-dasharray="8 6" stroke-width="2" opacity="0.4"/>
        
        <!-- Header Text -->
        <text x="500" y="160" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="44" fill="#A8BFB2" letter-spacing="4">★ TODAY'S ARTISAN SPECIAL ★</text>
        <line x1="280" y1="185" x2="720" y2="185" stroke="#A8BFB2" stroke-width="2" opacity="0.5"/>
        
        <!-- Main Target Text 1 -->
        <text x="500" y="390" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="64" fill="#EAE6D9" letter-spacing="3" transform="rotate(-1.5 500 390)">ORGANIC COLD BREW</text>
        
        <!-- Target Price Text 2 -->
        <text x="500" y="540" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="68" fill="#F4D06F" letter-spacing="2">$4.75</text>
        
        <!-- Footer notes -->
        <text x="500" y="620" text-anchor="middle" font-family="Inter, sans-serif" font-weight="400" font-size="20" fill="#88A092" letter-spacing="1">SLOW STEEPED FOR 24 HOURS IN SMALL BATCHES</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  },
  {
    id: 'cyberpunk-neon-billboard',
    title: 'Neon Cyber Billboard',
    category: 'Night Photography & Neon',
    description: 'Vibrant neon street billboard with glowing glow effects, dark moody urban atmosphere',
    presetTexts: [
      {
        id: 'sample-neon-1',
        text: 'NEO TOKYO 2099',
        suggestedNewText: 'SYNTH WAVE NIGHT',
        box_2d: [350, 150, 480, 850],
        fontFamily: 'Oswald',
        fontWeight: '700',
        color: '#FF2A85',
        shadowColor: '#FF2A85',
        shadowBlur: 18,
        backgroundColor: '#0A0818',
        rotationAngle: 2,
        blendMode: 'screen',
        cameraBlur: 0.6,
        filmGrain: 14,
        letterSpacing: 6,
      },
      {
        id: 'sample-neon-2',
        text: 'LIVE CONCERT',
        suggestedNewText: 'WORLD TOUR 2026',
        box_2d: [510, 260, 600, 740],
        fontFamily: 'Montserrat',
        fontWeight: '800',
        color: '#00F0FF',
        shadowColor: '#00F0FF',
        shadowBlur: 14,
        backgroundColor: '#0A0818',
        rotationAngle: 2,
        blendMode: 'screen',
        cameraBlur: 0.5,
        filmGrain: 12,
        letterSpacing: 4,
      },
    ],
    generateSvgDataUri: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750">
        <defs>
          <linearGradient id="neon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#040209"/>
            <stop offset="40%" stop-color="#0F0926"/>
            <stop offset="100%" stop-color="#070414"/>
          </linearGradient>
          <filter id="neon-glow-pink" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Dark City Background -->
        <rect width="1000" height="750" fill="url(#neon-bg)" />
        <!-- Distant City Silhouettes -->
        <rect x="80" y="300" width="140" height="450" fill="#090518" opacity="0.6"/>
        <rect x="250" y="240" width="180" height="510" fill="#0E0822" opacity="0.7"/>
        <rect x="620" y="220" width="160" height="530" fill="#0C0720" opacity="0.7"/>
        <rect x="800" y="320" width="150" height="430" fill="#080415" opacity="0.6"/>
        <!-- Street lights ambient blur -->
        <circle cx="200" cy="650" r="140" fill="#FF0077" opacity="0.12" filter="blur(60px)"/>
        <circle cx="800" cy="620" r="160" fill="#00D2FF" opacity="0.1" filter="blur(70px)"/>
        <!-- Billboard Frame Structure -->
        <rect x="100" y="120" width="800" height="510" rx="8" fill="#0C0A1C" stroke="#221C42" stroke-width="8"/>
        <!-- Inner Billboard Face -->
        <rect x="120" y="140" width="760" height="470" rx="4" fill="#0A0818"/>
        <!-- Grid overlay -->
        <path d="M120 220 H880 M120 300 H880 M120 380 H880 M120 460 H880 M120 540 H880" stroke="#181335" stroke-width="1"/>
        <path d="M250 140 V610 M400 140 V610 M550 140 V610 M700 140 V610" stroke="#181335" stroke-width="1"/>
        <!-- Top Small Tag -->
        <rect x="420" y="190" width="160" height="34" rx="4" fill="#FF0077" opacity="0.2"/>
        <text x="500" y="213" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="700" font-size="14" fill="#FF8EC6" letter-spacing="3">EXCLUSIVE EVENT</text>
        <!-- Main Neon Headline -->
        <text x="500" y="420" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="700" font-size="76" fill="#FF2A85" letter-spacing="6" filter="url(#neon-glow-pink)" transform="rotate(2 500 420)">NEO TOKYO 2099</text>
        <!-- Cyan Subtitle -->
        <text x="500" y="560" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="38" fill="#00F0FF" letter-spacing="5" filter="url(#neon-glow-cyan)" transform="rotate(2 500 560)">LIVE CONCERT</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  },
  {
    id: 'luxury-product-box',
    title: 'Luxury Cosmetic Packaging',
    category: 'Packaging & Labels',
    description: 'Clean matte minimal cosmetic box with gold embossed typography',
    presetTexts: [
      {
        id: 'sample-box-1',
        text: 'VELVET RADIANCE',
        suggestedNewText: 'HYDRA NOURISH',
        box_2d: [350, 180, 440, 820],
        fontFamily: 'Cinzel',
        fontWeight: '700',
        color: '#D4AF37',
        shadowColor: '#2B2317',
        shadowBlur: 2,
        backgroundColor: '#1A1817',
        rotationAngle: 0,
        blendMode: 'source-over',
        cameraBlur: 0.3,
        filmGrain: 8,
        letterSpacing: 5,
      },
      {
        id: 'sample-box-2',
        text: 'BOTANICAL FACE SERUM',
        suggestedNewText: 'OVERNIGHT RECOVERY OIL',
        box_2d: [470, 220, 540, 780],
        fontFamily: 'Montserrat',
        fontWeight: '600',
        color: '#E0D5C1',
        shadowColor: '#1A1817',
        shadowBlur: 1,
        backgroundColor: '#1A1817',
        rotationAngle: 0,
        blendMode: 'source-over',
        cameraBlur: 0.2,
        filmGrain: 7,
        letterSpacing: 4,
      },
    ],
    generateSvgDataUri: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750">
        <defs>
          <linearGradient id="studio-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#E8E4DF"/>
            <stop offset="70%" stop-color="#D5CECE"/>
            <stop offset="100%" stop-color="#B8AFB0"/>
          </linearGradient>
          <linearGradient id="box-front" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#242120"/>
            <stop offset="50%" stop-color="#1A1817"/>
            <stop offset="100%" stop-color="#121010"/>
          </linearGradient>
          <linearGradient id="gold-foil" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stop-color="#F3E7C4"/>
            <stop offset="50%" stop-color="#D4AF37"/>
            <stop offset="100%" stop-color="#AA7C11"/>
          </linearGradient>
        </defs>
        <!-- Studio Background -->
        <rect width="1000" height="750" fill="url(#studio-bg)"/>
        <!-- Box Shadow on Ground -->
        <ellipse cx="500" cy="650" rx="340" ry="40" fill="#000000" opacity="0.25" filter="blur(25px)"/>
        <!-- Product Box Container -->
        <rect x="220" y="110" width="560" height="530" rx="8" fill="url(#box-front)" stroke="#322E2D" stroke-width="2"/>
        <!-- Soft Box Sheen Highlight -->
        <path d="M220 110 L440 110 L260 640 L220 640 Z" fill="#FFFFFF" opacity="0.03"/>
        
        <!-- Brand Crest Icon -->
        <circle cx="500" cy="220" r="32" fill="none" stroke="url(#gold-foil)" stroke-width="2"/>
        <polygon points="500,202 512,228 488,228" fill="url(#gold-foil)" opacity="0.9"/>
        <text x="500" y="275" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="14" fill="#9E9284" letter-spacing="6">MAISON ROYALE</text>
        
        <!-- Gold Embossed Title Text -->
        <text x="500" y="405" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="46" fill="url(#gold-foil)" letter-spacing="6">VELVET RADIANCE</text>
        
        <!-- Subtitle Text -->
        <text x="500" y="505" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="19" fill="#E0D5C1" letter-spacing="5">BOTANICAL FACE SERUM</text>
        
        <text x="500" y="580" text-anchor="middle" font-family="Inter, sans-serif" font-weight="300" font-size="15" fill="#7A7067" letter-spacing="3">50 ML / 1.7 FL. OZ. e</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  },
  {
    id: 'vintage-poster',
    title: 'Vintage California Travel Poster',
    category: 'Posters & Art',
    description: 'Retro 1960s travel poster with aged paper texture and bold display typography',
    presetTexts: [
      {
        id: 'sample-poster-1',
        text: 'CALIFORNIA',
        suggestedNewText: 'SUNNY MIAMI',
        box_2d: [120, 150, 240, 850],
        fontFamily: 'Playfair Display',
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#E63946',
        shadowColor: '#1D3557',
        shadowBlur: 4,
        backgroundColor: '#F7EDE2',
        rotationAngle: 0,
        blendMode: 'multiply',
        cameraBlur: 0.4,
        filmGrain: 15,
        letterSpacing: 4,
      },
      {
        id: 'sample-poster-2',
        text: 'ENDLESS SUMMER',
        suggestedNewText: 'TROPICAL PARADISE',
        box_2d: [600, 200, 680, 800],
        fontFamily: 'Montserrat',
        fontWeight: '800',
        color: '#1D3557',
        shadowColor: '#F7EDE2',
        shadowBlur: 2,
        backgroundColor: '#F5CB5C',
        rotationAngle: 0,
        blendMode: 'multiply',
        cameraBlur: 0.3,
        filmGrain: 12,
        letterSpacing: 4,
      },
    ],
    generateSvgDataUri: () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750">
        <!-- Aged Paper Canvas -->
        <rect width="1000" height="750" fill="#F7EDE2" />
        <!-- Border -->
        <rect x="40" y="40" width="920" height="670" fill="none" stroke="#2B2D42" stroke-width="4"/>
        <rect x="52" y="52" width="896" height="646" fill="none" stroke="#2B2D42" stroke-width="1.5"/>
        
        <!-- Big Retro Sun -->
        <circle cx="500" cy="380" r="160" fill="#F5CB5C"/>
        <!-- Ocean Waves Graphic -->
        <path d="M60 480 Q 250 430, 500 480 T 940 480 L 940 680 L 60 680 Z" fill="#457B9D"/>
        <path d="M60 520 Q 250 480, 500 520 T 940 520 L 940 680 L 60 680 Z" fill="#1D3557"/>
        
        <!-- Palm Tree Silhouette -->
        <path d="M780 680 Q 770 480, 720 340 L 735 340 Q 780 480, 800 680 Z" fill="#2B2D42"/>
        <path d="M725 340 Q 640 310, 580 340 Q 650 360, 725 345 Z" fill="#2B2D42"/>
        <path d="M725 340 Q 700 270, 640 250 Q 690 300, 725 342 Z" fill="#2B2D42"/>
        <path d="M725 340 Q 780 270, 840 260 Q 790 310, 725 342 Z" fill="#2B2D42"/>
        <path d="M725 340 Q 820 320, 870 350 Q 800 365, 725 345 Z" fill="#2B2D42"/>
        
        <!-- Main Top Poster Text -->
        <text x="500" y="195" text-anchor="middle" font-family="Playfair Display, serif" font-weight="900" font-style="italic" font-size="82" fill="#E63946" letter-spacing="6">CALIFORNIA</text>
        
        <!-- Bottom Banner Area -->
        <rect x="180" y="585" width="640" height="75" rx="6" fill="#F5CB5C" stroke="#2B2D42" stroke-width="3"/>
        <text x="500" y="638" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="800" font-size="34" fill="#1D3557" letter-spacing="5">ENDLESS SUMMER</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  },
];
