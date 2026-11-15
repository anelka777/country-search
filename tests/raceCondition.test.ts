import { afterEach, describe, expect, it, vi } from 'vitest';
import spainResponse from './fixtures/spain.json';
import { mapCountryResponse } from '../src/mapCountryResponse.js';
import { createSearchController } from '../src/searchController.js';
import type { SearchState } from '../src/searchController.js';

const DEBOUNCE_MS = 10;

const [rawSpain] = spainResponse;

if (!rawSpain) {
  throw new Error('Fixture spain.json must contain at least one country');
}

const spain = mapCountryResponse(rawSpain);
const staleCountry = { ...rawSpain, name: 'Stale Country' };

type PendingRequest = {
  url: string;
  signal: AbortSignal;
  respond: (body: unknown) => void;
};

function stubControlledFetch() {
  const requests: PendingRequest[] = [];

  const fetchMock = vi.fn<typeof fetch>(
    (input, init) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('fetch must receive an AbortSignal'));
          return;
        }

        signal.addEventListener('abort', () => reject(signal.reason), { once: true });

        requests.push({
          url: String(input),
          signal,
          respond: (body) => resolve(new Response(JSON.stringify(body), { status: 200 })),
        });
      }),
  );

  vi.stubGlobal('fetch', fetchMock);
  return { requests };
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request race condition', () => {
  it('shows only the latest query when an older response arrives after the newer one', async () => {
    const { requests } = stubControlledFetch();
    const states: SearchState[] = [];
    const controller = createSearchController({
      debounceMs: DEBOUNCE_MS,
      onStateChange: (state) => states.push(state),
    });

    controller.input('sp');
    await vi.waitFor(() => expect(requests).toHaveLength(1));

    controller.input('spain');
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[0]?.signal.reason).toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(requests).toHaveLength(2));

    requests[1]?.respond([rawSpain]);
    await vi.waitFor(() => expect(states.at(-1)?.status).toBe('success'));

    requests[0]?.respond([staleCountry]);
    await pause(50);

    expect(requests.map((request) => request.url)).toEqual([
      'https://countries.dev/name/sp',
      'https://countries.dev/name/spain',
    ]);
    expect(states).toEqual([
      { status: 'loading', query: 'sp' },
      { status: 'loading', query: 'spain' },
      { status: 'success', query: 'spain', countries: [spain] },
    ]);
  });
});
