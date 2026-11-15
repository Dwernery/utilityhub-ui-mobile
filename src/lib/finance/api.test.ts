import { createAccount } from './api';

// Capture what would be sent over the network instead of sending it.
const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    status: 201,
    headers: { get: () => 'application/json' },
    json: async () => ({ id: 12, accountName: 'Brokerage', accountType: 'Investments', category: 'ASSET' }),
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const sentBody = () => JSON.parse(mockFetch.mock.calls[0][1].body);

describe('createAccount', () => {
  it('sends the account and its first balance in one POST', async () => {
    const created = await createAccount({
      accountName: 'Brokerage',
      accountType: 'Investments',
      category: 'ASSET',
      initialBalance: { balance: 1234.56, date: '2026-11-01' },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/finance\/accounts$/);
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(sentBody()).toEqual({
      accountName: 'Brokerage',
      accountType: 'Investments',
      category: 'ASSET',
      balance: 1234.56,
      balanceDate: '2026-11-01',
    });
    expect(created.id).toBe(12);
  });

  it('omits both balance fields when there is no initial balance', async () => {
    await createAccount({ accountName: 'Brokerage', accountType: 'Investments', category: 'ASSET' });

    expect(sentBody()).toEqual({ accountName: 'Brokerage', accountType: 'Investments', category: 'ASSET' });
  });
});
