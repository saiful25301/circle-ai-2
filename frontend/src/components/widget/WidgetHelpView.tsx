import React, { useState } from 'react';
import { Search, ChevronRight, BookOpen } from 'lucide-react';
import { Language, translations } from './localization/translations';

interface WidgetHelpViewProps {
  language: Language;
  onAskAboutArticle: (topic: string) => void;
}

export const WidgetHelpView: React.FC<WidgetHelpViewProps> = ({
  language,
  onAskAboutArticle,
}) => {
  const t = translations[language];
  const [query, setQuery] = useState('');

  const articles = [
    {
      id: 'kb-los',
      titleEn: 'Red LOS Light Blinking on ONU',
      titleBn: 'ওএনইউ-তে লাল এলওএস (LOS) লাইট জ্বলা',
      descEn: 'How to inspect fiber optic patch cord bends and verify light signal reception.',
      descBn: 'হলুদ ফাইবার ক্যাবল বাঁকা হয়েছে কি না তা চেক করা ও সমাধানের উপায়।',
      category: 'Troubleshooting'
    },
    {
      id: 'kb-pppoe',
      titleEn: 'Configuring PPPoE on Wi-Fi Routers',
      titleBn: 'ওয়াইফাই রাউটারে PPPoE কনফিগারেশন',
      descEn: 'Step-by-step setup for TP-Link, Tenda, D-Link, and Netgear routers (MTU 1492).',
      descBn: 'টিপি-লিংক, টেন্ডা ও অন্যান্য রাউটারে ইউজারনেম ও পাসওয়ার্ড দিয়ে সেটআপ গাইড।',
      category: 'Router Setup'
    },
    {
      id: 'kb-bkash',
      titleEn: 'Paying Monthly Bill via bKash & Nagad',
      titleBn: 'বিকাশ ও নগদে মাসিক বিল পরিশোধের নিয়ম',
      descEn: 'Merchant Pay to 01844XXXXXX with your Subscriber ID reference.',
      descBn: 'বিকাশ পেমেন্ট অপশনে গিয়ে রেফারেন্সে সাবস্ক্রাইবার আইডি দিয়ে বিল দিন।',
      category: 'Billing'
    },
    {
      id: 'kb-gaming',
      titleEn: 'BDIX Gaming Latency & DNS Optimization',
      titleBn: 'গেমিং পিং কমানো ও বিডিআইএক্স অপটিমাইজেশন',
      descEn: 'Setting Primary DNS to 1.1.1.1 and 8.8.8.8 for lowest ping in PUBG and Valorant.',
      descBn: 'গেমিংয়ে ল্যাগ কমাতে প্রাইমারি ডিএনএস ১.১.১.১ ব্যবহার ও ল্যান ক্যাবল কানেকশন।',
      category: 'Performance'
    },
    {
      id: 'kb-packages',
      titleEn: 'Unlimited Fiber Internet Packages (20 - 100 Mbps)',
      titleBn: 'সার্কেল আনলিমিটেড ফাইবার প্যাকেজসমূহ',
      descEn: 'Compare Circle Starter, Fast, Turbo, Gamer, and Ultra packages.',
      descBn: '২০ এমবিপিএস থেকে ১০০ এমবিপিএস পর্যন্ত সকল প্যাকেজের মূল্য ও বিডিআইএক্স স্পিড।',
      category: 'Packages'
    }
  ];

  const filtered = articles.filter(a => {
    const title = language === 'bn' ? a.titleBn : a.titleEn;
    const desc = language === 'bn' ? a.descBn : a.descEn;
    return title.toLowerCase().includes(query.toLowerCase()) || desc.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-4 text-slate-900 widget-scroll">
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-600" />
          {language === 'bn' ? 'সার্কেল নেটওয়ার্ক হেল্প সেন্টার' : 'Circle Network Help Center'}
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {language === 'bn' ? 'ইন্টারনেট সমস্যা সমাধানের সার্বিক নির্দেশিকা' : 'Official documentation & troubleshooting guides'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors shadow-2xs"
        />
      </div>

      {/* Article List */}
      <div className="flex-1 overflow-y-auto space-y-2 widget-scroll pr-1">
        {filtered.map((art) => (
          <button
            key={art.id}
            type="button"
            onClick={() => onAskAboutArticle(language === 'bn' ? art.titleBn : art.titleEn)}
            className="w-full text-left p-3.5 rounded-xl bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition-all group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                {art.category}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 mt-1.5 group-hover:text-amber-900 transition-colors">
              {language === 'bn' ? art.titleBn : art.titleEn}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {language === 'bn' ? art.descBn : art.descEn}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
