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
  const canvasRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Header section */}
      <header className="max-w-4xl mx-auto pt-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4 uppercase tracking-widest"
        >
          <Sparkles size={12} />
          <span>Cognitive Linguistics Tool</span>
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          The Semantic Solar System
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Map the radial categories and metaphorical extensions of any word using Lakoff's cognitive framework.
        </p>

        {/* Input area */}
        <div className="mt-10 max-w-lg mx-auto relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateMap()}
              placeholder="Enter a word (e.g. 'Fire', 'Run', 'Head')..."
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={generateMap}
            disabled={loading || !input.trim()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
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
      </header>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center"
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
              className="relative w-full aspect-square max-w-[800px] bg-[#020617] rounded-[32px] md:rounded-[40px] overflow-hidden border border-[#1e293b] flex items-center justify-center shadow-2xl"
            >
              {/* Space Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2563eb]/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4f46e5]/10 blur-[120px] rounded-full" />
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
                      className="absolute rounded-full bg-[#0f172a] border-2 border-[#6366f1]/50 flex items-center justify-center text-center p-2 cursor-help hover:scale-110 transition-all shadow-lg active:scale-95"
                      style={{
                        left: x - (innerNodeSize / 2),
                        top: y - (innerNodeSize / 2),
                        width: innerNodeSize,
                        height: innerNodeSize
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
                      className="absolute rounded-full bg-[#0f172a]/80 backdrop-blur-sm border-2 border-[#ec4899]/40 flex items-center justify-center text-center p-2 cursor-help hover:scale-110 transition-all shadow-lg active:scale-95"
                      style={{
                        left: x - (outerNodeSize / 2),
                        top: y - (outerNodeSize / 2),
                        width: outerNodeSize,
                        height: outerNodeSize
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
                    className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-[80%] max-w-sm bg-[#0f172a]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 pointer-events-none text-center"
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
                className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-all active:scale-95"
              >
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export Map as Image</span>
              </button>
            </div>
          </motion.div>
        ) : (
          !loading && (
            <div className="h-[500px] flex flex-col items-center justify-center text-slate-500 bg-slate-900/10 rounded-[40px] border border-dashed border-slate-800/50">
              <div className="mb-4 p-4 rounded-full bg-slate-900/50">
                <Info size={32} />
              </div>
              <p className="text-lg font-medium text-slate-400">Ready to map your first word.</p>
              <p className="text-sm mt-2 text-slate-600">Enter a term above to explore its cognitive orbits.</p>
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
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="text-blue-400" size={32} />
                </motion.div>
              </div>
            </div>
            <p className="mt-8 text-xl font-bold tracking-tight text-white">Traversing Cognitive Pathways...</p>
            <p className="mt-2 text-slate-400 animate-pulse italic">Thinking like George Lakoff...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
