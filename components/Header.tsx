'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, User } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [profile, setProfile] = useState<{ full_name: string | null; role: string | null } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Retry logic or just handle null gracefully
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setProfile(data);
          } else {
            // Fallback if profile doesn't exist yet
            setProfile({ full_name: user.user_metadata?.full_name || 'User', role: 'user' });
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    };
    fetchProfile();
  }, [supabase]);

  return (
    <header className="h-16 border-b border-border-dark flex items-center justify-between px-8 bg-background-dark/50 backdrop-blur-md sticky top-0 z-20">
      <div className="w-full max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search ticker (e.g., PETR4, VALE3, IBOV)"
            className="w-full bg-surface-dark border-none rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 text-sm text-white placeholder:text-slate-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:bg-surface-dark rounded-lg relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background-dark"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-border-dark mx-2"></div>
        
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              {profile?.role === 'admin' ? 'Administrator' : 'Verified Investor'}
            </p>
          </div>
          <div className="relative w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden group-hover:border-primary/50 transition-colors">
            <Image 
              src={`https://picsum.photos/seed/${profile?.full_name || 'user'}/100/100`} 
              alt="Profile" 
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
