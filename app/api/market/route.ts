import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.BRAPI_TOKEN;
  
  if (!token) {
    return NextResponse.json({ error: 'Brapi token not configured' }, { status: 500 });
  }

  try {
    // Fetch Ibovespa
    const ibovRes = await fetch(`https://brapi.dev/api/quote/^BVSP?token=${token}`);
    const ibovData = await ibovRes.json();
    const ibov = ibovData.results[0];

    // Fetch Dólar
    const dollarRes = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${token}`);
    const dollarData = await dollarRes.json();
    const dollar = dollarData.currency[0];

    // Fetch SELIC (using a fallback if endpoint fails or is different)
    let selic = { value: 10.75, nextCopom: '20 Mar 2024' };
    try {
      const selicRes = await fetch(`https://brapi.dev/api/v2/prime-rate?country=brazil&token=${token}`);
      const selicData = await selicRes.json();
      if (selicData['prime-rate']) {
        const latest = selicData['prime-rate'][selicData['prime-rate'].length - 1];
        selic = { 
          value: latest.value, 
          nextCopom: 'May 2024' // Brapi might not give this, so we estimate or use fixed
        };
      }
    } catch (e) {
      console.error('Failed to fetch SELIC', e);
    }

    return NextResponse.json({
      ibov: {
        value: ibov.regularMarketPrice,
        change: ibov.regularMarketChangePercent,
        high: ibov.regularMarketDayHigh,
        low: ibov.regularMarketDayLow
      },
      dollar: {
        value: dollar.bidPrice,
        change: dollar.variationPercentage,
        high: dollar.highPrice,
        low: dollar.lowPrice
      },
      selic
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
