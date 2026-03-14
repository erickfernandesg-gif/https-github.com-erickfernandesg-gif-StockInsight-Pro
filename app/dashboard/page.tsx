'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MarketSummary from '@/components/MarketSummary';
import AssetTable from '@/components/AssetTable';
import NewsSection from '@/components/NewsSection';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import TradeRulerCard from '@/components/TradeRulerCard';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client'; // <-- Importante para o banco
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  // Estados para as Operações Ativas
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  
  const supabase = createClient();

  // useEffect para buscar Trades e Preços ao Vivo
  useEffect(() => {
    const fetchActiveTrades = async () => {
      setIsLoadingTrades(true);
      
      // 1. Pegar o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Buscar favoritos com status 'active' e que tenham os valores preenchidos
      const { data: favorites, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error || !favorites) {
        console.error('Erro ao buscar trades:', error);
        setIsLoadingTrades(false);
        return;
      }

      // Filtra para garantir que só mostra cards que tenham os 3 valores (Entry, Stop, Target)
      const validTrades = favorites.filter(f => f.entry_price && f.stop_loss && f.target_price);
      setActiveTrades(validTrades);

      // 3. Se houver trades, buscar o preço atual deles na Brapi
      if (validTrades.length > 0) {
        const tickers = validTrades.map(t => t.ticker);
        try {
          const res = await fetch('/api/watchlist-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers })
          });
          const priceData = await res.json();
          
          // Monta um dicionário (Record) com { "PETR4": 44.78, "VALE3": 60.50 }
          const pricesMap: Record<string, number> = {};
          Object.values(priceData).forEach((item: any) => {
            pricesMap[item.ticker] = item.price;
          });
          
          setLivePrices(pricesMap);
        } catch (err) {
          console.error("Erro ao buscar preços ao vivo:", err);
        }
      }
      
      setIsLoadingTrades(false);
    };

    fetchActiveTrades();
  }, [supabase]);

  return (
    <div className="flex min-h-screen bg-background-dark">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full">
          
          {/* Market Overview */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 tracking-tight uppercase flex items-center gap-3">
              Market <span className="text-primary">Overview</span>
              <div className="size-2 rounded-full bg-green-500 animate-pulse mt-1" />
            </h2>
            <MarketSummary />
          </motion.div>

          {/* Trade Monitor (Dinâmico) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Active <span className="text-primary">Trade Monitor</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-surface-dark px-3 py-1 rounded-full border border-border-dark">
                Real-time Management
              </span>
            </div>
            
            {/* Grid Dinâmico das Réguas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {isLoadingTrades ? (
                 <div className="col-span-full flex items-center text-slate-500 py-8">
                   <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" />
                   <span className="text-sm font-bold uppercase tracking-widest">Sincronizando Operações...</span>
                 </div>
              ) : activeTrades.length === 0 ? (
                 <div className="col-span-full bg-surface-dark/50 border border-dashed border-border-dark rounded-2xl p-12 text-center text-slate-500">
                   <p className="text-sm font-bold uppercase tracking-widest">Nenhuma operação ativa.</p>
                   <p className="text-xs mt-2">Faça uma análise de ativo e salve o setup para monitorar aqui.</p>
                 </div>
              ) : (
                 activeTrades.map((trade) => (
                   <TradeRulerCard 
                      key={trade.id}
                      ticker={trade.ticker} 
                      entry={trade.entry_price} 
                      stop={trade.stop_loss} 
                      target={trade.target_price} 
                      // Puxa o preço ao vivo, se não tiver carregado ainda, usa o preço de entrada provisoriamente
                      current={livePrices[trade.ticker] || trade.entry_price} 
                   />
                 ))
              )}
            </div>
          </motion.section>

          {/* Tabela de Ativos e Notícias */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            <motion.div 
              className="xl:col-span-2 space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AssetTable />
              <NewsSection />
            </motion.div>

            {/* Coluna Lateral: Sentimento e Widgets */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <SentimentAnalysis />
              
              {/* Market Status Widget */}
              <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">B3 Segment</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Ibovespa Index</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-white">128.432</span>
                    <span className="text-primary text-xs font-bold">+1.24%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}