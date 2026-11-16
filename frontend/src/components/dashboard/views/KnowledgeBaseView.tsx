import React, { useState } from 'react';
import {
  Search,
  Zap,
  Eye,
  Clock,
  User,
  X,
} from 'lucide-react';
import { KBArticleItem } from '../types';
import { MOCK_KB_ARTICLES } from '../mockData';

export const KnowledgeBaseView: React.FC = () => {
  const [articles] = useState<KBArticleItem[]>(MOCK_KB_ARTICLES);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KBArticleItem | null>(null);

  const categories = ['all', 'troubleshooting', 'router_setup', 'billing', 'bdix', 'packages'];

  const filtered = articles.filter((a) => {
    if (activeCategory !== 'all' && a.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Main Articles Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search troubleshooting guides, router setup, bills..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs overflow-x-auto widget-scroll">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Article Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto widget-scroll bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                      {art.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{art.lastUpdated}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold">{art.citationsByAI}</span>
                    <span className="text-[10px] text-slate-400">AI citations</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{art.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Drawer: Article Detail Reader */}
      {selectedArticle && (
        <div className="w-96 border-l border-slate-200 bg-white p-6 overflow-y-auto widget-scroll space-y-4 shrink-0 shadow-xl animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
              {selectedArticle.category.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-bold text-base text-slate-900 leading-snug">{selectedArticle.title}</h3>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1 text-slate-700">
              <User className="w-3 h-3 text-amber-600" />
              {selectedArticle.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedArticle.lastUpdated}
            </span>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {selectedArticle.content}
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1 text-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              RAG Vector Retrieval Status
            </div>
            <p className="text-[11px] text-slate-600">
              This document is indexed in pgvector and automatically retrieved when subscribers mention related keywords.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
