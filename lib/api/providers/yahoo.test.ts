import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchYahooPrice, fetchYahooPrices, searchYahooSymbol } from './yahoo';

describe('Yahoo Finance relay', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses the deployed Render relay for symbol search by default', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      quotes: [{
        symbol: '4GLD.DE',
        longname: 'Xtrackers Physical Gold ETC',
        typeDisp: 'ETF',
        exchDisp: 'XETRA',
      }],
    }), { status: 200 }));

    await expect(searchYahooSymbol('4GLD')).resolves.toEqual([{
      symbol: '4GLD.DE',
      name: 'Xtrackers Physical Gold ETC',
      type: 'ETF',
      exchange: 'XETRA',
    }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://edineros-yahoo-relay.onrender.com/api/yahoo/search?q=4GLD');
  });

  it('rejects failed price requests so cached prices are not replaced with null', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }));

    await expect(fetchYahooPrice('SXRV.DE')).rejects.toThrow('Yahoo Finance API error: 502');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://edineros-yahoo-relay.onrender.com/api/yahoo/chart?symbol=SXRV.DE');
  });

  it('fetches Spark batches through the configured relay and maps price metadata', async () => {
    vi.stubEnv('VITE_YAHOO_RELAY_URL', 'https://relay.example/');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      spark: {
        result: [{
          symbol: 'SXRV.DE',
          response: [{
            meta: {
              regularMarketPrice: 1446.6,
              chartPreviousClose: 1465.2,
              currency: 'EUR',
              longName: 'iShares NASDAQ 100 UCITS ETF',
            },
          }],
        }],
      },
    }), { status: 200 }));

    await expect(fetchYahooPrices(['SXRV.DE'])).resolves.toEqual({
      'SXRV.DE': {
        price: 1446.6,
        currency: 'EUR',
        name: 'iShares NASDAQ 100 UCITS ETF',
        todayChangePercent: expect.any(Number),
      },
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://relay.example/api/yahoo/spark?symbols=SXRV.DE');
  });
});
