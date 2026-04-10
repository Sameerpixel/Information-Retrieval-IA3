import React, { useState, useMemo, useRef } from "react";
import { 
  Upload, 
  Search, 
  BarChart3, 
  ArrowLeft, 
  Film, 
  Info, 
  Sparkles, 
  ChevronRight,
  Play,
  X
} from "lucide-react";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { motion, AnimatePresence } from "motion/react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { 
  Document, 
  calculateRSJ, 
  tokenize, 
  TermStats 
} from "../lib/rsj";

interface Movie {
  title: string;
  overview: string;
}

export default function MoviePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovieIndex, setSelectedMovieIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle JSON upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;
      try {
        const content = JSON.parse(result);
        if (Array.isArray(content)) {
          setMovies(content);
          setSelectedMovieIndex(null);
        } else {
          alert("Invalid JSON format. Expected an array of movies.");
        }
      } catch (error) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Filter movies based on search
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const queryTerms = tokenize(searchQuery);
    return movies.filter(movie => {
      const titleTerms = tokenize(movie.title);
      const overviewTerms = tokenize(movie.overview);
      return queryTerms.every(q => 
        titleTerms.some(t => t.includes(q)) || 
        overviewTerms.some(t => t.includes(q))
      );
    });
  }, [movies, searchQuery]);

  // RSJ Computation for selected movie
  const rsjResults = useMemo(() => {
    if (selectedMovieIndex === null || movies.length === 0) return [];
    
    const docs: Document[] = movies.map((m, idx) => ({
      id: idx.toString(),
      name: m.title,
      content: m.overview,
      isRelevant: idx === selectedMovieIndex
    }));

    // For movies, we want to restrict analysis to terms that actually exist in the selected movie.
    // This prevents "hallucinated" keywords from other movies appearing in the results.
    return calculateRSJ(docs, "", true, true);
  }, [movies, selectedMovieIndex]);

  const topTerms = useMemo(() => rsjResults.slice(0, 15), [rsjResults]);

  // Similar Movies Logic
  const similarMovies = useMemo(() => {
    if (selectedMovieIndex === null || movies.length === 0 || topTerms.length === 0) return [];

    const selectedMovie = movies[selectedMovieIndex];
    const topTermSet = new Set<string>(topTerms.map(t => t.term));

    const scored = movies
      .map((movie, idx) => {
        if (idx === selectedMovieIndex) return null;
        
        const movieTerms = new Set<string>(tokenize(movie.overview));
        const sharedTerms = Array.from(topTermSet).filter((t: string) => movieTerms.has(t));
        
        return {
          movie,
          sharedTerms,
          score: sharedTerms.length
        };
      })
      .filter((m): m is { movie: Movie; sharedTerms: string[]; score: number } => m !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored;
  }, [movies, selectedMovieIndex, topTerms]);

  const selectedMovie = selectedMovieIndex !== null ? movies[selectedMovieIndex] : null;

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-[#141414]/80 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Demo</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Film size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Movie Intelligence</h1>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
        
        {/* Dataset Input & Search */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Movie Library</h2>
              <p className="text-slate-400 text-sm">Upload a JSON dataset to begin analysis</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                <Upload size={18} />
                Import JSON
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {movies.length === 0 ? (
            <div className="aspect-video md:aspect-[21/9] rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-white/[0.02]">
              <div className="p-4 bg-white/5 rounded-full">
                <Film size={48} className="text-slate-500" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold">No Movies Loaded</h3>
                <p className="text-slate-400">Upload a JSON file containing an array of movie objects with 'title' and 'overview' fields.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-all"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredMovies.map((movie, idx) => {
                  const originalIndex = movies.indexOf(movie);
                  const isSelected = selectedMovieIndex === originalIndex;
                  return (
                    <motion.div
                      key={originalIndex}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -8 }}
                      onClick={() => setSelectedMovieIndex(originalIndex)}
                      className={cn(
                        "relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all border-2",
                        isSelected ? "border-indigo-500 ring-4 ring-indigo-500/20" : "border-transparent hover:border-white/20"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                      <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Placeholder Poster */}
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <Film size={48} className="text-white/10" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 space-y-1">
                        <h4 className="font-bold text-sm line-clamp-2 leading-tight">{movie.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {movie.overview}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 z-30 bg-indigo-500 p-1.5 rounded-full shadow-lg">
                          <Sparkles size={14} className="text-white" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Analysis Section */}
        <AnimatePresence>
          {selectedMovie && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="space-y-12 pt-12 border-t border-white/10"
            >
              {/* Selected Movie Hero */}
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest">
                      <Sparkles size={12} />
                      Selected for Analysis
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">{selectedMovie.title}</h2>
                    <p className="text-lg text-slate-400 leading-relaxed italic">
                      "{selectedMovie.overview}"
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Info size={20} className="text-indigo-400" />
                      What defines this movie?
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {topTerms.map((t, i) => (
                        <motion.span
                          key={t.term}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium hover:bg-white/10 transition-colors cursor-default"
                        >
                          {t.term}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl space-y-4">
                    <h4 className="font-bold flex items-center gap-2 text-indigo-400">
                      <Sparkles size={18} />
                      Intelligence Insight
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      This movie is defined by words like 
                      <span className="text-white font-bold"> {topTerms.slice(0, 3).map(t => `"${t.term}"`).join(", ")} </span>
                      because they appear in this movie but rarely in others. The RSJ model identifies these as the most 
                      statistically significant terms for this specific title.
                    </p>
                  </div>
                </div>

                {/* Visualization */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-400" />
                      Keyword Significance
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">RSJ Weighting</span>
                  </div>
                  <div className="h-[400px] w-full flex items-center justify-center">
                    <Bar 
                      data={{
                        labels: topTerms.map(t => t.term),
                        datasets: [
                          {
                            label: 'RSJ Weight',
                            data: topTerms.map(t => t.weight),
                            backgroundColor: '#10b981',
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        indexAxis: 'y' as const,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: '#0f172a',
                            titleColor: '#818cf8',
                            bodyColor: '#fff',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                          }
                        },
                        scales: {
                          x: {
                            display: false,
                            grid: {
                              display: false,
                            }
                          },
                          y: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              color: '#94a3b8',
                              font: {
                                size: 12,
                                weight: 'bold'
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Similar Movies */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Sparkles className="text-indigo-400" />
                    Recommended for You
                  </h3>
                  <p className="text-sm text-slate-500">Based on shared high-weight keywords</p>
                </div>

                <div className="grid md:grid-cols-5 gap-6">
                  {similarMovies.map((item, i) => (
                    <motion.div
                      key={item.movie.title}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group space-y-4"
                    >
                      <div className="aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden relative border border-white/10 hover:border-indigo-500 transition-all">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film size={40} className="text-white/5" />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 z-20">
                          <button className="w-full py-2 bg-white text-black rounded-lg font-bold text-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                            <Play size={12} fill="currentColor" />
                            Details
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-sm line-clamp-1">{item.movie.title}</h4>
                        <div className="flex flex-wrap gap-1">
                          {item.sharedTerms.slice(0, 2).map(term => (
                            <span key={term} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md font-bold">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="pt-24 pb-12 text-center border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-slate-500 mb-4">
            <Film size={20} />
            <span className="font-bold tracking-tighter text-lg text-slate-300">MOVIE INTEL</span>
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            A real-world application of the Robertson–Sparck Jones model for keyword intelligence and content-based recommendation.
          </p>
        </footer>
      </main>
    </div>
  );
}
