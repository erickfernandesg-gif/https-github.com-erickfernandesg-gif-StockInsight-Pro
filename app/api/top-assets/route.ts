import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  try {
    // Fetch top assets (most traded)
    // Brapi has /api/quote/list for this
    const res = await fetch(`https://brapi.dev/api/quote/list?sortBy=volume&sortOrder=desc&limit=10&token=${token}`);
    const data = await res.json();
    
    const assets = data.stocks.map((stock: any) => ({
      ticker: stock.stock,
      name: stock.name,
      price: stock.close,
      change: stock.change,
      isPositive: stock.change >= 0,
      marketCap: stock.market_cap || 'N/A',
      volume: stock.volume,
      trend: [10, 20, 15, 40, 35, 60, 55, 85] // Mock trend for now as Brapi list doesn't give historical
    }));

    return NextResponse.json(assets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
