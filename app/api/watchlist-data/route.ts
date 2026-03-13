import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const token = process.env.BRAPI_TOKEN;
  const { tickers } = await req.json();
  
  if (!token) {
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
    return NextResponse.json({});
  }

  try {
    const tickersStr = tickers.join(',');
    const res = await fetch(`https://brapi.dev/api/quote/${tickersStr}?token=${token}`);
    const data = await res.json();
    
    const results: Record<string, any> = {};
    data.results.forEach((stock: any) => {
      results[stock.symbol] = {
        ticker: stock.symbol,
        name: stock.longName || stock.shortName || stock.symbol,
        price: stock.regularMarketPrice,
        change: stock.regularMarketChangePercent,
      };
    });

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
