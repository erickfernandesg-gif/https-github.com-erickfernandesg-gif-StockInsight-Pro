'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion } from 'motion/react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Star, Loader2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Favorite {
  id: string;
  ticker: string;
  added_at: string;
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

          {/* Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-dark rounded-2xl border border-border-dark shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-dark bg-background-dark/30">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">24h Change</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added At</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Syncing Watchlist...</p>
                      </td>
                    </tr>
                  ) : favorites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Your watchlist is empty.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary text-xs font-black mt-2 hover:underline">Add your first asset</button>
                      </td>
                    </tr>
                  ) : favorites.map((fav) => {
                    const data = assetsData[fav.ticker];
                    return (
                      <tr key={fav.id} className="hover:bg-primary/5 transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-background-dark flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:text-primary transition-colors">
                              {fav.ticker[0]}
                            </div>
                            <div>
                              <div className="font-black text-white group-hover:text-primary transition-colors">{fav.ticker}</div>
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{data?.name || 'Loading...'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-200">
                          {data ? `$${data.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {data ? (
                            <span className={`font-bold text-sm flex items-center gap-0.5 ${data.change >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                              {data.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {data.change.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-400 font-medium">
                            {new Date(fav.added_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveAsset(fav.id); }}
                            className="text-slate-500 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-background-dark/30 border-t border-border-dark flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">Showing {favorites.length} favorited assets</p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
