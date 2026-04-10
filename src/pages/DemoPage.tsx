import React, { useState, useMemo } from "react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Info, 
  Search, 
  BarChart3, 
  Table as TableIcon, 
  Download, 
  Trash2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { 
  Document, 
  calculateRSJ, 
  tokenize, 
  TermStats 
} from "../lib/rsj";

export default function DemoPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [useStopwords, setUseStopwords] = useState(true);
  const [hoveredTerm, setHoveredTerm] = useState<TermStats | null>(null);

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setDocuments(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            content,
            isRelevant: false
          }
        ]);
      };
      reader.readAsText(file);
    });
  };

  const toggleRelevance = (id: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, isRelevant: !doc.isRelevant } : doc
    ));
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Processing logic
  const results = useMemo(() => {
    if (documents.length === 0) return [];
    return calculateRSJ(documents, query, useStopwords);
  }, [documents, query, useStopwords]);

  // Filter results to show only query terms or top terms
  const displayResults = useMemo(() => {
    if (query.trim() === "") return results.slice(0, 20);
    const queryTerms = new Set(tokenize(query));
    return results.filter(r => queryTerms.has(r.term)).concat(
      results.filter(r => !queryTerms.has(r.term)).slice(0, 10)
    );
  }, [results, query]);

  const downloadCSV = () => {
    const headers = ["Term", "r (Relevant with Term)", "n (Total with Term)", "RSJ Weight"];
    const rows = results.map(r => [r.term, r.r, r.n, r.weight.toFixed(4)]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "rsj_weights.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Introduction */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                <BarChart3 size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">RSJ Weight Explorer</h1>
                <p className="text-slate-500">Robertson–Sparck Jones Information Retrieval Model</p>
              </div>
            </div>

            <Link 
              to="/movies"
              className="group flex items-center gap-4 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
            >
              <div className="text-left">
                <p className="text-xs opacity-80 uppercase tracking-wider mb-0.5">Real-World Application</p>
                <p className="text-lg">Movie Intelligence Tool</p>
              </div>
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
            >
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Info size={18} />
                </span>
                What is RSJ Weight?
              </h2>
              <p className="text-slate-600 leading-relaxed">
                The RSJ weight measures how effective a term is at distinguishing 
                <span className="font-semibold text-indigo-600"> relevant</span> documents from 
                <span className="font-semibold text-slate-400"> non-relevant</span> ones.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                  <span>High weight: Term appears mostly in relevant docs.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="text-red-500 shrink-0" size={16} />
                  <span>Low weight: Term appears mostly in non-relevant docs.</span>
                </li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl space-y-4"
            >
              <h2 className="text-xl font-semibold">The Formula</h2>
              <div className="bg-slate-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-indigo-300 text-lg">
                  w = log( ((r + 0.5)/(R - r + 0.5)) / ((n - r + 0.5)/(N - n - R + r + 0.5)) )
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div><span className="text-slate-100 font-mono">N</span>: Total Documents</div>
                <div><span className="text-slate-100 font-mono">R</span>: Relevant Documents</div>
                <div><span className="text-slate-100 font-mono">n</span>: Docs with Term</div>
                <div><span className="text-slate-100 font-mono">r</span>: Relevant with Term</div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Input Section */}
        <section className="grid lg:grid-cols-3 gap-8">
          
          {/* File Upload & Query */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">1. Upload Documents</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    multiple 
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center group-hover:border-indigo-400 transition-colors bg-slate-50">
                    <Upload className="mx-auto text-slate-400 group-hover:text-indigo-500 mb-2" />
                    <p className="text-sm text-slate-500">Drop .txt files here or click to browse</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-700">2. Enter Query</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. information retrieval"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setUseStopwords(!useStopwords)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                    useStopwords ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    useStopwords ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
                <span className="text-sm text-slate-600 font-medium">Remove Stopwords</span>
              </div>
            </div>
          </div>

          {/* Document List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                Documents ({documents.length})
              </h3>
              {documents.length > 0 && (
                <button 
                  onClick={() => setDocuments([])}
                  className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                >
                  <Trash2 size={14} /> Clear All
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {documents.map((doc) => (
                  <motion.div 
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all relative group",
                      doc.isRelevant 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                        : "bg-white border-slate-200"
                    )}
                  >
                    <button 
                      onClick={() => removeDocument(doc.id)}
                      className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="flex items-start gap-3">
                      <div 
                        onClick={() => toggleRelevance(doc.id)}
                        className={cn(
                          "mt-1 w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors",
                          doc.isRelevant ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                        )}
                      >
                        {doc.isRelevant && <CheckCircle2 size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                          {(() => {
                            const text = doc.content.substring(0, 150);
                            if (!query.trim()) return `"${text}..."`;
                            const terms = tokenize(query);
                            const regex = new RegExp(`(${terms.join("|")})`, "gi");
                            const parts = text.split(regex);
                            return (
                              <>
                                "
                                {parts.map((part, i) => 
                                  terms.some(t => t.toLowerCase() === part.toLowerCase()) ? (
                                    <span key={i} className="bg-yellow-200 text-slate-900 not-italic font-bold px-0.5 rounded">
                                      {part}
                                    </span>
                                  ) : part
                                )}
                                ..."
                              </>
                            );
                          })()}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            doc.isRelevant ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {doc.isRelevant ? "Relevant" : "Non-Relevant"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {documents.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl">
                  <AlertCircle className="mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 font-medium">No documents uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results Section */}
        {documents.length > 0 && (
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 pt-8 border-t border-slate-200"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="text-indigo-600" />
                Analysis Results
              </h2>
              <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Download size={16} /> Download CSV
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Visualization */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  Top Weighted Terms
                </h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={displayResults.slice(0, 15)} 
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                      onMouseMove={(state: any) => {
                        if (state.activePayload) {
                          setHoveredTerm(state.activePayload[0].payload);
                        }
                      }}
                      onMouseLeave={() => setHoveredTerm(null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="term" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as TermStats;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
                                <p className="font-bold text-indigo-300 mb-1">{data.term}</p>
                                <p>RSJ Weight: <span className="font-mono">{data.weight.toFixed(4)}</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                        {displayResults.slice(0, 15).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.weight > 0 ? '#4f46e5' : '#ef4444'} 
                            fillOpacity={0.8}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Explanation Panel */}
                <AnimatePresence>
                  {hoveredTerm && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
                    >
                      <p className="text-sm text-indigo-900">
                        The term <span className="font-bold">"{hoveredTerm.term}"</span> appears in 
                        <span className="font-bold"> {hoveredTerm.r}</span> relevant documents and 
                        <span className="font-bold"> {hoveredTerm.n}</span> total documents. 
                        Its weight is <span className="font-bold">{hoveredTerm.weight.toFixed(4)}</span>, 
                        indicating <span className="font-bold">{hoveredTerm.weight > 0 ? "high" : "low"}</span> importance.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <TableIcon size={18} className="text-indigo-600" />
                    Detailed Statistics
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Showing {displayResults.length} terms</span>
                </div>
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Term</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">r</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">n</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">RSJ Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayResults.map((row, i) => (
                        <tr 
                          key={i} 
                          className="hover:bg-slate-50 transition-colors group cursor-default"
                          onMouseEnter={() => setHoveredTerm(row)}
                          onMouseLeave={() => setHoveredTerm(null)}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.term}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{row.r}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{row.n}</td>
                          <td className={cn(
                            "px-4 py-3 text-sm font-mono text-right",
                            row.weight > 0 ? "text-indigo-600" : "text-red-500"
                          )}>
                            {row.weight.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <footer className="pt-12 pb-8 text-center border-t border-slate-200">
          <p className="text-sm text-slate-400 font-medium">
            Educational Tool for Information Retrieval Concepts • Built with React & Tailwind
          </p>
        </footer>
      </div>
    </div>
  );
}
