import { useState, useRef, useEffect, memo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Download, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  CircleDot,
  Layers,
  Map as MapIcon,
  BookOpen,
  Layout,
  HelpCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { domToPng } from 'modern-screenshot';

// Gemini API Configuration
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface OrbitItem {
  phrase: string;
  connection: string;
  icon: string; // Dynamic icon name from lucide-react
}

interface RadialMap {
  target_word: string;
  pronunciation?: string;
  etymology?: string;
  prototype: { meaning: string; icon: string };
  inner_orbit: OrbitItem[];
  outer_orbit: OrbitItem[];
}

// Helper to render lucide icon by name
const DynamicIcon = memo(({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
  // Map strings to Lucide component names
  const iconName = name.split(/[-_]/).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('') as keyof typeof LucideIcons;
  const IconComponent = (LucideIcons[iconName] || LucideIcons.HelpCircle) as any;
  return <IconComponent size={size} className={className} />;
});

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<RadialMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const generateMap = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setMapData(null);

    try {
      const prompt = `Analyze the word '${input}' through a cognitive linguistics lens using George Lakoff's radial categories theory. 
Construct a detailed vertical infographic dataset.
Return a strict JSON object with this schema:
{
  "target_word": "The word (Title Case)",
  "pronunciation": "/prəˌnənsēˈāSH(ə)n/",
  "etymology": "Brief root origin (max 10 words)",
  "prototype": { 
    "meaning": "Literal central meaning",
    "icon": "Lucide icon name (e.g. 'Flame', 'Footprints', 'Home')"
  },
  "inner_orbit": [ 
    {
      "phrase": "Direct semantic extension", 
      "connection": "Why the brain connects this",
      "icon": "Relevant Lucide icon name"
    } 
  ], // Exactly 3 items
  "outer_orbit": [ 
    {
      "phrase": "Metaphorical extension", 
      "connection": "The metaphorical mapping logic",
      "icon": "Relevant Lucide icon name"
    } 
  ] // Exactly 4 items
}

Use common Lucide icon names like: House, Flame, Heart, Brain, Cloud, Wind, Activity, Zap, Shield, Target, Award, Book, Camera, Coffee, Globe, Key, Lock, Map, Music, Sun, Tool, Truck, Umbrella, User, Video, Watch.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              target_word: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              etymology: { type: Type.STRING },
              prototype: {
                type: Type.OBJECT,
                properties: {
                  meaning: { type: Type.STRING },
                  icon: { type: Type.STRING }
                },
                required: ["meaning", "icon"]
              },
              inner_orbit: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phrase: { type: Type.STRING },
                    connection: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  },
                  required: ["phrase", "connection", "icon"]
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
                    connection: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  },
                  required: ["phrase", "connection", "icon"]
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
      setError("Analysis failed. Please try a different word.");
    } finally {
      setLoading(false);
    }
  };

  const exportAsImage = async () => {
    if (!posterRef.current) return;
    setLoading(true);
    try {
      const dataUrl = await domToPng(posterRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        quality: 1,
      });
      const link = document.createElement('a');
      link.download = `semantic-infographic-${mapData?.target_word || 'word'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      setError("Export failed. This can happen with very large infographics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] font-sans selection:bg-[#3b82f6] selection:text-white pb-20 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-12">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-6 shadow-xl"
          >
            <Sparkles size={14} className="text-blue-500" />
            <span>Infographic Word Lab</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
            Semantic Navigator
          </h1>
          <p className="text-slate-400 text-lg">
            Visualize the radial structure and metaphorical logic of any word.
          </p>
        </header>

        {/* Search Input */}
        <div className="mb-16">
          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
              <Search size={22} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateMap()}
              placeholder="Enter a term (e.g. 'Flame', 'Path')..."
              className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl py-5 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xl shadow-2xl placeholder:text-slate-600"
            />
            {input && (
              <button 
                onClick={generateMap}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              </button>
            )}
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-rose-500 text-center text-sm font-medium">
              {error}
            </motion.p>
          )}
        </div>

        {mapData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* INFOGRAPHIC POSTER */}
            <div 
              ref={posterRef}
              className="bg-slate-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-12px_rgba(0,0,0,0.8)] p-8 md:p-12 relative"
            >
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                {/* 1. Header Information */}
                <div className="flex flex-col items-center text-center mb-16 pb-12 border-b border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Semantic Profile</span>
                  <h2 className="text-6xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-white drop-shadow-2xl">
                    {mapData.target_word}
                  </h2>
                  <div className="flex flex-wrap justify-center items-center gap-4 text-slate-400 font-mono text-xs md:text-sm">
                    <span className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10">{mapData.pronunciation}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 hidden md:block" />
                    <span className="tracking-wide italic">{mapData.etymology}</span>
                  </div>
                </div>

                {/* 2. Core Prototype Card */}
                <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 w-full shadow-2xl mb-16 relative overflow-hidden flex flex-col items-center text-center">
                   <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                   <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner border border-white/20">
                      <DynamicIcon name={mapData.prototype.icon} size={40} className="text-white" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100/70 mb-4">Central Prototype Meaning</p>
                   <h3 className="text-2xl md:text-3xl font-black leading-tight text-white max-w-lg mb-2">
                     {mapData.prototype.meaning}
                   </h3>
                </div>

                {/* 3. Direct Semantic Extensions (Inner Orbit) */}
                <div className="mb-16">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg">
                      <Layout size={18} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-200">Semantic Orbits</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="grid gap-6">
                    {mapData.inner_orbit.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ x: 8 }}
                        className="group flex flex-col md:flex-row gap-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-[2rem] p-8 transition-all shadow-xl"
                      >
                         <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <DynamicIcon name={item.icon} size={28} className="text-blue-400" />
                         </div>
                         <div className="flex flex-col justify-center">
                            <h4 className="text-lg font-black uppercase tracking-wide text-white mb-2">{item.phrase}</h4>
                            <p className="text-base text-slate-400 leading-relaxed italic">{item.connection}</p>
                         </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* 4. Metaphorical Mappings (Outer Orbit) */}
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg">
                      <MapIcon size={18} className="text-purple-400" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-200">Metaphorical Horizon</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mapData.outer_orbit.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -8 }}
                        className="bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 hover:bg-slate-900 transition-all flex flex-col items-center text-center shadow-lg"
                      >
                         <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                            <DynamicIcon name={item.icon} size={24} className="text-purple-400" />
                         </div>
                         <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-4">{item.phrase}</h4>
                         <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.connection}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Watermark Footer */}
                <div className="mt-24 pt-10 border-t border-white/5 flex flex-col items-center gap-8">
                   <div className="flex items-center gap-4 opacity-40">
                      <div className="w-8 h-[2px] bg-blue-500" />
                      <CircleDot size={20} className="text-blue-500" />
                      <div className="w-8 h-[2px] bg-blue-500" />
                   </div>
                   <div className="flex flex-col items-center gap-2">
                     <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-slate-600">Cognitive Navigator v1.0</p>
                     <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-slate-700">created at https://cbse.smartresourcesacademy.com/word-web-maker</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Poster Actions */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 pb-12">
              <button
                onClick={exportAsImage}
                className="group flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-black px-10 py-5 rounded-[2rem] transition-all active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
              >
                <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                <span>Download Infographic</span>
              </button>
              
              <button
                onClick={() => setMapData(null)}
                className="flex items-center gap-3 bg-slate-900/50 hover:bg-white/10 text-slate-400 font-bold px-10 py-5 rounded-[2rem] transition-all border border-white/10"
              >
                <span>New Analysis</span>
              </button>
            </div>
          </motion.div>
        ) : (
          !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[450px] flex flex-col items-center justify-center text-slate-600 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5"
            >
              <div className="mb-8 p-8 rounded-[2.5rem] bg-slate-900/50 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen size={64} className="text-blue-500/30 relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 mb-2">Ready for Navigation</h3>
              <p className="text-center text-slate-600 max-w-sm px-6 leading-relaxed">
                Enter any concept to generate a professional vertical infographic based on radial category theory.
              </p>
            </motion.div>
          )
        )}
      </div>

      {/* Loading Experience */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020617]/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-6"
          >
            <div className="relative mb-12">
               <div className="w-32 h-32 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-[spin_1.2s_cubic_bezier(0.76,0,0.24,1)_infinite]" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180, 270, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Layers className="text-blue-400" size={40} />
                  </motion.div>
               </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-black text-white tracking-tight mb-4">Analysing Category Nodes</h2>
              <div className="space-y-3">
                 {[ "Deconstructing semantics", "Extracting metaphors", "Formatting infographic" ].map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.4 }}
                      className="flex items-center justify-center gap-3 text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]"
                    >
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                       {text}
                    </motion.div>
                 ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
