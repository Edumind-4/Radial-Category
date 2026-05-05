import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, Info, Loader2, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';

// Gemini API Configuration
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface OrbitItem {
  phrase: string;
  connection: string;
}

interface RadialMap {
  target_word: string;
  prototype: { meaning: string };
  inner_orbit: OrbitItem[];
  outer_orbit: OrbitItem[];
}

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<RadialMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ text: string, connection: string } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isEmbed, setIsEmbed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Detect embed mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbed(params.get('embed') === 'true');
  }, []);

  // Responsive logic
  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [mapData]);

  // Dynamic Scale factors
  const scale = dimensions.width / 800;
  const innerRadius = 140 * (scale || 1);
  const outerRadius = 280 * (scale || 1);
  const sunSize = 140 * (scale || 1);
  const innerNodeSize = 96 * (scale || 1);
  const outerNodeSize = 112 * (scale || 1);

  const generateMap = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setMapData(null);

    try {
      const prompt = `Analyze the word '${input}' using George Lakoff's theory of radial categories. Return a strict JSON object with this exact schema:
{
  "target_word": "The word",
  "prototype": { "meaning": "The most central, literal, physical meaning of the word." },
  "inner_orbit": [ {"phrase": "A close physical extension", "connection": "Why the brain connects this"} ], // Provide exactly 3 items
  "outer_orbit": [ {"phrase": "A highly abstract/metaphorical extension", "connection": "The metaphorical logic"} ] // Provide exactly 4 items
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              target_word: { type: Type.STRING },
              prototype: {
                type: Type.OBJECT,
                properties: {
                  meaning: { type: Type.STRING }
                },
                required: ["meaning"]
              },
              inner_orbit: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    connection: { type: Type.STRING }
                  },
                  required: ["phrase", "connection"]
                },
                minItems: 3,
                maxItems: 3
              },
              outer_orbit: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    connection: { type: Type.STRING }
                  },
                  required: ["phrase", "connection"]
                },
                minItems: 4,
                maxItems: 4
              }
            },
            required: ["target_word", "prototype", "inner_orbit", "outer_orbit"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setMapData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate map. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportAsImage = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#0f172a', // slate-900
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `semantic-map-${mapData?.target_word || 'word'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] font-sans overflow-x-hidden">
      {/* Header section */}
      {!isEmbed && (
        <header className="max-w-4xl mx-auto pt-12 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60a5fa] text-xs font-medium mb-4 uppercase tracking-widest"
          >
            <Sparkles size={12} />
            <span>Cognitive Linguistics Tool</span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            The Semantic Solar System
          </h1>
          <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Map the radial categories and metaphorical extensions of any word using Lakoff's cognitive framework.
          </p>
        </header>
      )}

      {/* Input area */}
      <div className={`${isEmbed ? 'pt-8' : 'mt-10'} max-w-lg mx-auto px-6 relative`}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#64748b] group-focus-within:text-[#60a5fa] transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateMap()}
              placeholder="Enter a word (e.g. 'Fire', 'Run', 'Head')..."
              className="w-full bg-[rgba(15,23,42,0.5)] border border-[#1e293b] rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.5)] transition-all text-lg placeholder:text-[#475569]"
            />
          </div>
          <button
            onClick={generateMap}
            disabled={loading || !input.trim()}
            className="mt-4 w-full bg-[#2563eb] hover:bg-[#3b82f6] disabled:bg-[#0f172a] disabled:text-[#475569] font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.2), 0 4px 6px -4px rgba(30, 58, 138, 0.1)' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Analyzing Cognition...</span>
              </>
            ) : (
              <span>Generate Radial Map</span>
            )}
          </button>
        </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto mt-6 p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-xl text-[#f87171] text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Canvas */}
      <main className="max-w-6xl mx-auto mt-16 px-6 pb-24">
        {mapData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div
              ref={canvasRef}
              id="radial-map-canvas"
              className="relative w-full aspect-square max-w-[800px] bg-[#020617] rounded-[32px] md:rounded-[40px] overflow-hidden border border-[#1e293b] flex items-center justify-center"
              style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            >
              {/* Space Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(37,99,235,0.1)] blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(79,70,229,0.1)] blur-[120px] rounded-full" />
              </div>

              {/* Orbit Guides */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <circle cx="50%" cy="50%" r={innerRadius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 8" />
                <circle cx="50%" cy="50%" r={outerRadius} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 8" />
              </svg>

              {/* Center - The Sun (Prototype) */}
              <motion.div
                className="relative z-20 flex flex-col items-center"
                onMouseEnter={() => setHoveredNode({ text: mapData.target_word, connection: mapData.prototype.meaning })}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ width: sunSize, height: sunSize }}
              >
                <div 
                  className="w-full h-full rounded-full bg-gradient-to-br from-[#60a5fa] to-[#4f46e5] flex items-center justify-center text-center p-4 shadow-[0_0_50px_rgba(59,130,246,0.5)] border-4 border-white/20"
                >
                  <span 
                    className="font-black uppercase tracking-tight text-white drop-shadow-md"
                    style={{ fontSize: `${2 * (scale || 1)}rem` }}
                  >
                    {mapData.target_word}
                  </span>
                </div>
                <div className="mt-4 text-center absolute -bottom-16 w-48 pointer-events-none">
                  <p className="text-[10px] md:text-xs font-bold text-[#60a5fa] uppercase tracking-widest mb-1">Prototype</p>
                  <p className="text-xs md:text-sm text-[#cbd5e1] font-medium leading-tight line-clamp-2">{mapData.prototype.meaning}</p>
                </div>
              </motion.div>

              {/* Inner Orbit (3 Items) */}
              {mapData.inner_orbit.map((item, i) => {
                const angle = (i * (360 / 3)) * (Math.PI / 180);
                const x = Math.cos(angle) * innerRadius;
                const y = Math.sin(angle) * innerRadius;

                return (
                  <motion.div
                    key={`inner-${i}`}
                    className="absolute z-10 flex flex-col items-center"
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 40 + i * 5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      transformOrigin: "center center",
                      top: "50%",
                      left: "50%",
                      width: 0,
                      height: 0,
                    }}
                  >
                    <motion.div
                      className="absolute rounded-full bg-[#0f172a] border-2 border-[rgba(99,102,241,0.5)] flex items-center justify-center text-center p-2 cursor-help hover:scale-110 transition-all active:scale-95"
                      style={{
                        left: x - (innerNodeSize / 2),
                        top: y - (innerNodeSize / 2),
                        width: innerNodeSize,
                        height: innerNodeSize,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }}
                      animate={{ rotate: [0, -360] }}
                      transition={{ duration: 40 + i * 5, repeat: Infinity, ease: "linear" }}
                      onMouseEnter={() => setHoveredNode({ text: item.phrase, connection: item.connection })}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <span className="font-bold text-[#f8fafc] leading-tight" style={{ fontSize: `${0.75 * (scale || 1)}rem` }}>
                        {item.phrase}
                      </span>
                    </motion.div>
                  </motion.div>
                );
              })}

              {/* Outer Orbit (4 Items) */}
              {mapData.outer_orbit.map((item, i) => {
                const angle = (i * (360 / 4) + 45) * (Math.PI / 180);
                const x = Math.cos(angle) * outerRadius;
                const y = Math.sin(angle) * outerRadius;

                return (
                  <motion.div
                    key={`outer-${i}`}
                    className="absolute z-10 flex flex-col items-center"
                    animate={{ rotate: [0, -360] }}
                    transition={{
                      duration: 60 + i * 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      transformOrigin: "center center",
                      top: "50%",
                      left: "50%",
                      width: 0,
                      height: 0,
                    }}
                  >
                    <motion.div
                      className="absolute rounded-full bg-[rgba(15,23,42,0.8)] backdrop-blur-sm border-2 border-[rgba(236,72,153,0.4)] flex items-center justify-center text-center p-2 cursor-help hover:scale-110 transition-all active:scale-95"
                      style={{
                        left: x - (outerNodeSize / 2),
                        top: y - (outerNodeSize / 2),
                        width: outerNodeSize,
                        height: outerNodeSize,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 60 + i * 10, repeat: Infinity, ease: "linear" }}
                      onMouseEnter={() => setHoveredNode({ text: item.phrase, connection: item.connection })}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <span className="font-bold text-[#f1f5f9] leading-tight" style={{ fontSize: `${0.75 * (scale || 1)}rem` }}>
                        {item.phrase}
                      </span>
                    </motion.div>
                  </motion.div>
                );
              })}

              {/* Hover Info Tooltip (Inside Canvas) */}
              <AnimatePresence>
                {hoveredNode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-[80%] max-w-sm bg-[rgba(15,23,42,0.95)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] rounded-2xl p-4 z-50 pointer-events-none text-center"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <h4 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">{hoveredNode.text}</h4>
                      <p className="text-[10px] md:text-xs text-[#cbd5e1] leading-relaxed italic">
                        {hoveredNode.connection}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* WATERMARK */}
              <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none opacity-30 select-none">
                <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#64748b]">
                  created at https://cbse.smartresourcesacademy.com/word-web-maker
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-12 flex gap-4" data-html2canvas-ignore="true">
              <button
                onClick={exportAsImage}
                className="group flex items-center gap-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-white font-medium px-8 py-4 rounded-2xl transition-all active:scale-95"
              >
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export Map as Image</span>
              </button>
            </div>
          </motion.div>
        ) : (
          !loading && (
            <div className="h-[500px] flex flex-col items-center justify-center text-[#64748b] bg-[rgba(15,23,42,0.1)] rounded-[40px] border border-dashed border-[rgba(30,41,59,0.5)]">
              <div className="mb-4 p-4 rounded-full bg-[rgba(15,23,42,0.5)]">
                <Info size={32} />
              </div>
              <p className="text-lg font-medium text-[#94a3b8]">Ready to map your first word.</p>
              <p className="text-sm mt-2 text-[#475569]">Enter a term above to explore its cognitive orbits.</p>
            </div>
          )
        )}
      </main>

      {/* Loading Placeholder */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgba(2,6,23,0.9)] backdrop-blur-md z-50 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-[rgba(59,130,246,0.1)] border-t-[#3b82f6] rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="text-[#60a5fa]" size={32} />
                </motion.div>
              </div>
            </div>
            <p className="mt-8 text-xl font-bold tracking-tight text-white">Traversing Cognitive Pathways...</p>
            <p className="mt-2 text-[#94a3b8] animate-pulse italic">Thinking like George Lakoff...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
