import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchYahooSymbol } from './yahoo';

describe('Yahoo Finance proxy fallback', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('switches proxies when a proxy returns 401 during symbol search', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'API key required' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('codetabs.com');
    expect(String(fetchMock.mock.calls[1][0])).toContain('allorigins.win');
  });
});
