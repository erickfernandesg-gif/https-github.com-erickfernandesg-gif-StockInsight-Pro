'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion } from 'motion/react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Star, Loader2, Search, Target, ShieldAlert, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Favorite {
  id: string;
  ticker: string;
  added_at: string;
  entry_price?: number;
  stop_loss?: number;
  target_price?: number;
  status?: string;
}

interface AssetData {
  ticker: string;
  price: number;
  change: number;
  name: string;
}

export default function WatchlistPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [assetsData, setAssetsData] = useState<Record<string, AssetData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const supabase = createClient();

  const fetchFavorites = useCallback(async (mounted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && mounted) {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (mounted) {
        if (error) {
          console.error('Error fetching favorites:', error);
        } else {
          setFavorites(data || []);
          
          // Fetch real data for each ticker
          if (data && data.length > 0) {
            try {
              const tickers = data.map(f => f.ticker);
              const res = await fetch('/api/watchlist-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickers })
              });
              const realData = await res.json();
              setAssetsData(realData);
            } catch (e) {
              console.error('Error fetching real data:', e);
            }
          }
        }
        setIsLoading(false);
      }
    } else if (mounted) {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      await fetchFavorites(mounted);
    };
    loadData();
    return () => { mounted = false; };
  }, [fetchFavorites]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_favorites')
      .insert([{ user_id: user.id, ticker: newTicker.toUpperCase() }]);

    if (error) {
      if (error.code === '23505') {
        alert('Asset already in watchlist');
      } else {
        alert('Error adding asset: ' + error.message);
      }
    } else {
      setNewTicker('');
      setIsAdding(false);
      fetchFavorites(true);
    }
  };

  const handleRemoveAsset = async (id: string) => {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error removing asset: ' + error.message);
    } else {
      fetchFavorites(true);
    }
  };

  // Calculadora da Régua de Trade
// Calculadora da Régua de Trade (CORRIGIDA)
  const getTradeStatus = (currentPrice: number, stop: number, target: number, entry: number) => {
    if (target === stop) return { status: 'ERROR', progress: 0, entryPos: 0, isProfit: false, text: 'Config Inválida' };

    const isLong = target > stop; 
    
    // Calcula as distâncias e porcentagens primeiro
    const totalRange = Math.abs(target - stop);
    const currentDist = isLong ? (currentPrice - stop) : (stop - currentPrice);
    const entryDist = isLong ? (entry - stop) : (stop - entry);

    // Clamps (garante que a bolinha não vaze para fora da barra, ficando entre 0 e 100)
    const currentProgress = Math.min(Math.max((currentDist / totalRange) * 100, 0), 100);
    const entryPos = Math.min(Math.max((entryDist / totalRange) * 100, 0), 100);
    const isProfit = isLong ? currentPrice > entry : currentPrice < entry;

    // Verifica Status
    const isStopped = isLong ? currentPrice <= stop : currentPrice >= stop;
    const isTargetHit = isLong ? currentPrice >= target : currentPrice <= target;

    // Retorna SEMPRE a estrutura completa
    if (isStopped) {
      return { status: 'STOPPED', progress: 0, entryPos, isProfit: false, text: 'STOP LOSS ACIONADO' };
    }
    if (isTargetHit) {
      return { status: 'PROFIT', progress: 100, entryPos, isProfit: true, text: 'ALVO ATINGIDO' };
    }

    return {
      status: 'RUNNING',
      progress: currentProgress,
      entryPos,
      isProfit
    };
  };

  const getRowStyle = (statusResult: any) => {
    if (statusResult.status === 'STOPPED') {
      return 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    }
    if (statusResult.status === 'PROFIT') {
      return 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    }
    return 'bg-surface-dark border-border-dark hover:border-primary/50';
  };

  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex items-end justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-3xl font-black text-white tracking-tight">Your <span className="text-primary">Watchlist</span></h2>
              <p className="text-slate-500 mt-1 font-medium">Real-time performance and AI sentiment analysis for your favorite assets.</p>
            </motion.div>
            
            <motion.button 
              onClick={() => setIsAdding(!isAdding)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 bg-primary px-5 py-2.5 rounded-xl text-background-dark font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
            >
              <Plus className="w-5 h-5" />
              {isAdding ? 'Cancel' : 'Add New Asset'}
            </motion.button>
          </div>

          {isAdding && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddAsset}
              className="bg-surface-dark p-6 rounded-2xl border border-primary/30 shadow-lg flex gap-4 items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="Enter ticker (e.g. AAPL, NVDA, BTC)..."
                  className="w-full bg-background-dark border-border-dark rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 text-sm text-white placeholder:text-slate-600 border transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="bg-primary text-background-dark px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all"
              >
                Add to List
              </button>
            </motion.form>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Assets Tracked</p>
              <h3 className="text-2xl font-black text-white">{favorites.length}</h3>
              <p className="text-xs text-slate-500 font-bold mt-2">Active monitoring enabled</p>
            </div>
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Market Status</p>
              <div className="flex items-center justify-between mt-1">
                <h3 className="text-2xl font-black text-white">OPEN</h3>
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-md font-black">LIVE</span>
              </div>
            </div>
            <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark shadow-sm">
              <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">AI Sentiment</p>
              <div className="flex items-center gap-3 mt-1">
                <h3 className="text-2xl font-black text-white">Mixed</h3>
                <div className="flex-1 h-2 bg-background-dark rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid (Substituindo Tabela) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isLoading ? (
                    <div className="col-span-full py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Syncing Watchlist...</p>
                    </div>
                  ) : favorites.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-surface-dark rounded-2xl border border-dashed border-slate-700">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Your watchlist is empty.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary text-xs font-black mt-2 hover:underline">Add your first asset</button>
                    </div>
                  ) : favorites.map((fav) => {
                    const data = assetsData[fav.ticker];
                    
                    // Trade Logic
                    const hasTradeSetup = fav.entry_price && fav.stop_loss && fav.target_price && data;
                    let tradeStatus = null;
                    
                    if (hasTradeSetup) {
                      tradeStatus = getTradeStatus(data.price, fav.stop_loss!, fav.target_price!, fav.entry_price!);
                    }

                    const cardStyle = hasTradeSetup ? getRowStyle(tradeStatus) : 'bg-surface-dark border-border-dark hover:border-primary/50';

                    return (
                      <div key={fav.id} className={`p-6 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${cardStyle}`}>
                        {/* Header do Card */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-background-dark/50 flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                              {fav.ticker[0]}
                            </div>
                            <div>
                              <h3 className="font-black text-lg text-white leading-none">{fav.ticker}</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{data?.name?.slice(0, 20) || 'Loading...'}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                             <p className="text-lg font-mono font-bold text-white">
                               {data ? `R$ ${data.price.toFixed(2)}` : '---'}
                             </p>
                             {data && (
                                <div className={`flex items-center justify-end gap-1 text-xs font-bold ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {data.change.toFixed(2)}%
                                </div>
                             )}
                          </div>
                        </div>

                        {/* A Régua (Trade Monitor) */}
                        <div className="mb-4">
                          {hasTradeSetup && tradeStatus ? (
                            <div className="w-full">
                              {/* Status Alert Text */}
                              {(tradeStatus.status !== 'RUNNING') && (
                                <div className={`mb-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-1 rounded-md ${
                                    tradeStatus.status === 'STOPPED' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {tradeStatus.status === 'STOPPED' ? <ShieldAlert className="w-4 h-4"/> : <Target className="w-4 h-4"/>}
                                  {tradeStatus.text}
                                </div>
                              )}

                              {/* Visual Ruler */}
                              <div className="relative h-8 w-full mt-2">
                                  {/* Base Track */}
                                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    {/* Stop Area (Left of Entry) - Visual Hint */}
                                    <div className="absolute left-0 top-0 h-full bg-rose-500/20" style={{ width: `${tradeStatus.entryPos}%` }}></div>
                                    {/* Profit Area (Right of Entry) - Visual Hint */}
                                    <div className="absolute right-0 top-0 h-full bg-emerald-500/20" style={{ width: `${100 - tradeStatus.entryPos}%` }}></div>
                                  </div>

                                  {/* Entry Marker (Vertical Line) */}
                                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-400/50" style={{ left: `${tradeStatus.entryPos}%` }}></div>
                                  
                                  {/* Current Price Marker (Puck) */}
                                  <div 
                                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-surface-dark shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 transition-all duration-700 ease-out flex items-center justify-center ${
                                        tradeStatus.isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    style={{ left: `${tradeStatus.progress}%` }}
                                  >
                                    <div className="w-1 h-1 bg-white rounded-full"></div>
                                  </div>
                                  
                                  {/* Labels */}
                                  <div className="flex justify-between mt-5 text-[9px] font-bold text-slate-500 uppercase font-mono">
                                    <span className="text-rose-400">STOP: {fav.stop_loss}</span>
                                    <span className="text-emerald-400">ALVO: {fav.target_price}</span>
                                  </div>
                              </div>
                            </div>
                          ) : (
                             <div className="h-12 flex items-center justify-center bg-background-dark/30 rounded-lg border border-dashed border-slate-800">
                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sem Setup Definido</span>
                             </div>
                          )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-border-dark/50">
                           <span className="text-[10px] text-slate-600 font-medium">Add: {new Date(fav.added_at).toLocaleDateString()}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveAsset(fav.id); }}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
