'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const news = [
  {
    id: 'news-1',
    category: 'Macro',
    time: '24 min ago',
    title: 'Central Bank signals potential SELIC cuts as inflation moderates beyond expectations.',
    description: 'Market analysts revised their projections for the end of the year, pointing to a more aggressive easing cycle...',
    image: 'https://picsum.photos/seed/finance/200/200'
  },
  {
    id: 'news-2',
    category: 'Earnings',
    time: '1 hour ago',
    title: 'Petrobras beats Q4 estimates with record production levels in Pre-salt fields.',
    description: 'The state-owned giant reported a net income that surpassed consensus by 12.5%, driven by operational efficiency...',
    image: 'https://picsum.photos/seed/oil/200/200'
  }
];

export default function NewsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Latest Market News</h2>
        <Link href="/news" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
          All News
        </Link>
      </div>
      <div className="space-y-4">
        {news.map((item) => (
          <Link href={`/news/${item.id}`} key={item.id}>
            <div
              className="group bg-surface-dark p-4 rounded-xl border border-border-dark flex gap-4 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-24 h-24 bg-slate-800 rounded-lg shrink-0 overflow-hidden relative">
                <Image 
                  src={item.image} 
                  alt={item.title} 
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded uppercase tracking-tighter">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{item.time}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-2 leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
