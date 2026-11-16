import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Zap,
  Clock,
  User,
  X,
  Plus,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  RefreshCw,
  Power,
  Layers,
} from 'lucide-react';
import { KnowledgeArticle } from '../../../types';
import { api } from '../../../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'packages', label: 'Packages & Speeds' },
  { id: 'pricing', label: 'Pricing & Plans' },
  { id: 'coverage', label: 'Coverage Areas' },
  { id: 'payment_methods', label: 'Payment Methods' },
  { id: 'installation', label: 'Installation' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'company_info', label: 'Company & Helpline' },
  { id: 'faq', label: 'FAQ & Policies' },
  { id: 'router_setup', label: 'Router Setup' },
];

interface SemanticResult {
  id: string;
  document_id: string;
  title: string;
  category: string;
  snippet: string;
  similarity_score: number;
  source_reference: string;
}

export const KnowledgeBaseView: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  // Ask KB / Semantic Search State
  const [testQuery, setTestQuery] = useState('');
  const [searchingSemantic, setSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticResult[] | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('packages');
  const [formContent, setFormContent] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formAuthor, setFormAuthor] = useState('Circle NOC Team');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getKnowledgeBase(activeCategory, search, true);
      setArticles(data || []);
    } catch (err: any) {
      console.error('Failed to load KB articles:', err);
      setError(err.message || 'Failed to load Knowledge Base from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [activeCategory]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Run Semantic Search Preview
  const handleSemanticSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : testQuery).trim();
    if (!q) return;
    setSearchingSemantic(true);
    try {
      const results = await api.searchKnowledgeBaseSemantic(q, activeCategory === 'all' ? undefined : activeCategory, 4, 0.25);
      setSemanticResults(results);
    } catch (err: any) {
      console.error('Semantic search error:', err);
      showToast('Error during vector search: ' + err.message);
    } finally {
      setSearchingSemantic(false);
    }
  };

  // Toggle active/published
  const handleToggleActive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.toggleKnowledgeArticleActive(id);
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_published: res.is_published } : a))
      );
      if (selectedArticle && selectedArticle.id === id) {
        setSelectedArticle({ ...selectedArticle, is_published: res.is_published });
      }
      showToast(`Article status updated to ${res.is_published ? 'Active (Published)' : 'Draft (Unpublished)'}`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Delete article
  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will also remove all its indexed vector chunks.`)) {
      return;
    }
    try {
      await api.deleteKnowledgeArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (selectedArticle && selectedArticle.id === id) {
        setSelectedArticle(null);
      }
      showToast(`Article "${title}" deleted.`);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormCategory(activeCategory !== 'all' ? activeCategory : 'packages');
    setFormContent('');
    setFormSummary('');
    setFormKeywords('');
    setFormIsPublished(true);
    setFormAuthor('Circle NOC Team');
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setFormTitle(article.title);
    setFormCategory(article.category);
    setFormContent(article.content);
    setFormSummary(article.summary || '');
    setFormKeywords(Array.isArray(article.keywords) ? article.keywords.join(', ') : '');
    setFormIsPublished(article.is_published !== false);
    setFormAuthor(article.author || 'Circle NOC Team');
    setIsEditOpen(true);
  };

  // Save New Article
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Title and content are required.');
      return;
    }
    setSubmitting(true);
    try {
      const keywordsArray = formKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await api.createKnowledgeArticle({
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        summary: formSummary.trim() || undefined,
        keywords: keywordsArray,
        is_published: formIsPublished,
        author: formAuthor.trim(),
      });

      setIsCreateOpen(false);
      showToast(`Article created! ${res.chunks_count || 1} semantic chunks indexed with Gemini Embeddings.`);
      fetchArticles();
    } catch (err: any) {
      alert('Failed to create article: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Edit Article
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Title and content are required.');
      return;
    }
    setSubmitting(true);
    try {
      const keywordsArray = formKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      await api.updateKnowledgeArticle(selectedArticle.id, {
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        summary: formSummary.trim() || undefined,
        keywords: keywordsArray,
        is_published: formIsPublished,
        author: formAuthor.trim(),
      });

      setIsEditOpen(false);
      showToast('Article updated and re-indexed in vector database.');
      fetchArticles();
      // Update selected article view
      setSelectedArticle({
        ...selectedArticle,
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        summary: formSummary.trim(),
        keywords: keywordsArray,
        is_published: formIsPublished,
        author: formAuthor.trim(),
      });
    } catch (err: any) {
      alert('Failed to update article: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle File Upload (.txt / .md)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const category = activeCategory !== 'all' ? activeCategory : 'troubleshooting';
      const res = await api.uploadKnowledgeArticleFile(file, category, 'NOC Technical Writer');
      showToast(`Uploaded "${res.title}" successfully! Indexed with ${res.chunks_created} semantic chunks.`);
      fetchArticles();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (activeCategory !== 'all' && a.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.content.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-slideUp">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Articles View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header & Action Bar */}
        <div className="p-4 border-b border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <h1 className="text-base font-bold text-slate-900">Knowledge Base & RAG Engine</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {articles.length} verified docs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage official Circle Network ISP packages, BDIX cache policies, and technical guidelines grounded for Gemini AI.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.markdown"
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
                title="Upload .txt or .md technical documentation"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>{isUploading ? 'Indexing File...' : 'Upload .txt/.md'}</span>
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:shadow-md transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Article</span>
              </button>
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages, pricing, coverage, troubleshooting..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs overflow-x-auto widget-scroll">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize whitespace-nowrap transition-colors cursor-pointer text-xs ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Semantic Search / Ask KB Preview Card */}
        <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Ask Knowledge Base — Live RAG Vector Search Preview
              </h2>
            </div>
            <span className="text-[10px] text-amber-700 bg-amber-100/70 border border-amber-300/60 px-2 py-0.5 rounded-md font-semibold">
              gemini-embedding-001 (768-dim)
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                placeholder="Ask any customer question in Bangla or English (e.g. 'Circle 70 Mbps প্যাকেজের দাম কত?', 'বিকাশে কীভাবে বিল দিব?')..."
                className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs"
              />
            </div>
            <button
              type="button"
              disabled={searchingSemantic || !testQuery.trim()}
              onClick={() => handleSemanticSearch()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {searchingSemantic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Test Vector Match</span>
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-500 font-medium">Try asking:</span>
            {[
              'Circle 70 Mbps প্যাকেজের দাম কত?',
              'বিকাশ দিয়ে বিল দেওয়ার নিয়ম কি?',
              'Uttara coverage check',
              'Optical LOS লাল বাতি জ্বলছে',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setTestQuery(chip);
                  handleSemanticSearch(chip);
                }}
                className="text-[10px] text-amber-800 bg-white/80 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Semantic Search Results Display */}
          {semanticResults && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-semibold">Top Retrieved Semantic Snippets ({semanticResults.length}):</span>
                <button
                  type="button"
                  onClick={() => setSemanticResults(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  Clear results
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {semanticResults.length === 0 ? (
                  <p className="text-xs text-slate-500 italic col-span-2">No matching semantic chunks found for this query.</p>
                ) : (
                  semanticResults.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                            {r.category}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {Math.round(r.similarity_score * 100)}% match
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 leading-snug">{r.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                          {r.snippet}
                        </p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{r.source_reference}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const found = articles.find((a) => a.id === r.document_id);
                            if (found) setSelectedArticle(found);
                          }}
                          className="text-amber-700 font-bold hover:underline"
                        >
                          View doc
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Article Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto widget-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Loading Knowledge Base articles...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-center space-y-2 max-w-lg mx-auto mt-12">
              <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
              <h3 className="font-bold text-sm">Failed to Load Knowledge Base</h3>
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={fetchArticles}
                className="mt-2 px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3 max-w-md mx-auto text-center">
              <FileText className="w-10 h-10 text-slate-300" />
              <div>
                <h3 className="font-bold text-sm text-slate-700">No Knowledge Articles Found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {search ? `No articles match "${search}".` : 'No documents in this category yet.'}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600"
              >
                Create New Article
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer shadow-xs flex flex-col justify-between group ${
                    selectedArticle?.id === art.id
                      ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                      : 'border-slate-200 hover:border-amber-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        {art.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleActive(e, art.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                            art.is_published !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle publish status"
                        >
                          <Power className="w-2.5 h-2.5" />
                          <span>{art.is_published !== false ? 'Published' : 'Draft'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors leading-snug line-clamp-2">
                      {art.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {art.summary || (art.content ? art.content.slice(0, 150) + '...' : '')}
                    </p>

                    {/* Keywords Tag List */}
                    {art.keywords && art.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {art.keywords.slice(0, 3).map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono"
                          >
                            #{kw}
                          </span>
                        ))}
                        {art.keywords.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{art.keywords.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>{art.citationsByAI || art.citations_count || 0} citations</span>
                      </span>
                      {art.chunk_count !== undefined && (
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                          <Layers className="w-3 h-3" />
                          {art.chunk_count} chunks
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(art);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                        title="Edit Article"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, art.id, art.title)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer: Detailed Article Viewer (Responsive Drawer on Mobile/Tablet) */}
      {selectedArticle && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md lg:static lg:w-96 lg:z-auto border-l border-slate-200 bg-white p-4 sm:p-6 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-2xl lg:shadow-xl animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              {selectedArticle.category.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(selectedArticle)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
                title="Edit Article"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="font-bold text-base text-slate-900 leading-snug">{selectedArticle.title}</h3>

          <div className="flex items-center gap-3 text-[11px] text-slate-500 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1 text-slate-700">
              <User className="w-3 h-3 text-amber-600" />
              {selectedArticle.author || 'Circle Technical Team'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedArticle.lastUpdated || 'Nov 2026'}
            </span>
          </div>

          {/* RAG Vector Embedding Status Badge */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5 text-xs">
            <div className="font-bold text-slate-900 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-amber-800">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                RAG Vector Status
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-[10px]">
                {selectedArticle.chunk_count || 'Multi-Chunk'} Indexed
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Chunked and embedded with <strong>gemini-embedding-001</strong>. The AI Agent automatically retrieves snippets whenever customers ask related queries.
            </p>
          </div>

          {/* Article Full Content */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Document Content</h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedArticle.content}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => handleToggleActive(e, selectedArticle.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                selectedArticle.is_published !== false
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{selectedArticle.is_published !== false ? 'Set to Draft' : 'Publish Article'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleDelete(e, selectedArticle.id, selectedArticle.title)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE ARTICLE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto widget-scroll animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Plus className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900">New Knowledge Base Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Circle Fiber 70 Mbps Package"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Short Summary (Optional)</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Brief 1-sentence overview for quick previews..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Content (Markdown / Text) *</label>
                  <span className="text-[10px] text-slate-400">Supports Bangla & English</span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Enter detailed package specs, pricing, BDIX speed, step-by-step instructions, or helpline details..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-900 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="e.g. 70mbps, 999tk, bdix, best seller"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="Circle NOC Documentation"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create-publish"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="create-publish" className="text-xs text-slate-700 select-none">
                  Publish immediately (Auto-chunks & generates Gemini embeddings)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Indexing Document...' : 'Create & Index'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ARTICLE MODAL */}
      {isEditOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto widget-scroll animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Edit Knowledge Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Short Summary</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Content (Markdown / Text) *</label>
                  <span className="text-[10px] text-amber-700">Re-computes vector embeddings automatically</span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-900 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-publish"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="edit-publish" className="text-xs text-slate-700 select-none">
                  Published and available for AI RAG retrieval
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Updating & Re-indexing...' : 'Save & Re-index'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
