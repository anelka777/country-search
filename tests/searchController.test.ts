import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import spainResponse from './fixtures/spain.json';
import { HttpError } from '../src/httpError.js';
import { mapCountryResponse } from '../src/mapCountryResponse.js';
import { createSearchController } from '../src/searchController.js';
import type { SearchFn, SearchState } from '../src/searchController.js';

const DEBOUNCE_MS = 300;

const [rawSpain] = spainResponse;

if (!rawSpain) {
  throw new Error('Fixture spain.json must contain at least one country');
}

const spain = mapCountryResponse(rawSpain);

function setup(search: SearchFn) {
  const states: SearchState[] = [];
  const controller = createSearchController({
    search,
    debounceMs: DEBOUNCE_MS,
    onStateChange: (state) => states.push(state),
  });
  return { controller, states };
}

function neverSettles(): Promise<never> {
  return new Promise(() => {});
}

describe('searchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('does not search until the delay has passed', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);

      expect(search).not.toHaveBeenCalled();
    });

    it('searches once with the last text after fast typing', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller } = setup(search);

      controller.input('s');
      controller.input('sp');
      controller.input('spa');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('spa', expect.any(AbortSignal));
    });

    it('trims the query before searching', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller } = setup(search);

      controller.input('  spain  ');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });
  });

  describe('states', () => {
    it('goes from loading to success with countries', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller, states } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(states).toEqual([
        { status: 'loading', query: 'spain' },
        { status: 'success', query: 'spain', countries: [spain] },
      ]);
    });

    it('shows empty when nothing is found', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([]);
      const { controller, states } = setup(search);

      controller.input('qqqqqqq');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(states.at(-1)).toEqual({ status: 'empty', query: 'qqqqqqq' });
    });

    it.each([
      ['http', new HttpError(500)],
      ['timeout', new DOMException('The operation timed out', 'TimeoutError')],
      ['network', new TypeError('Failed to fetch')],
    ])('shows a %s error', async (kind, error) => {
      const search = vi.fn<SearchFn>().mockRejectedValue(error);
      const { controller, states } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(states.at(-1)).toEqual({ status: 'error', query: 'spain', kind });
    });

    it('does not show an error when the request was cancelled', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      const search = vi.fn<SearchFn>().mockRejectedValue(abortError);
      const { controller, states } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(states).toEqual([{ status: 'loading', query: 'spain' }]);
    });
  });

  describe('empty input', () => {
    it('shows idle and does not search', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller, states } = setup(search);

      controller.input('   ');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).not.toHaveBeenCalled();
      expect(states).toEqual([{ status: 'idle' }]);
    });

    it('cancels a pending debounced search when the input is cleared', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller } = setup(search);

      controller.input('spain');
      controller.input('');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).not.toHaveBeenCalled();
    });
  });

  describe('cancellation of the previous request', () => {
    it('aborts the in-flight request immediately on new input, before debounce fires', async () => {
      const search = vi.fn<SearchFn>(() => neverSettles());
      const { controller } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      const firstSignal = search.mock.calls[0]?.[1];
      expect(firstSignal?.aborted).toBe(false);

      controller.input('spaini');

      expect(firstSignal?.aborted).toBe(true);
    });

    it('aborts the in-flight request when the input is cleared', async () => {
      const search = vi.fn<SearchFn>(() => neverSettles());
      const { controller } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      const signal = search.mock.calls[0]?.[1];

      controller.input('');

      expect(signal?.aborted).toBe(true);
    });

    it('gives every request its own signal', async () => {
      const search = vi.fn<SearchFn>(() => neverSettles());
      const { controller } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.input('france');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      const firstSignal = search.mock.calls[0]?.[1];
      const secondSignal = search.mock.calls[1]?.[1];
      expect(firstSignal).not.toBe(secondSignal);
      expect(firstSignal?.aborted).toBe(true);
      expect(secondSignal?.aborted).toBe(false);
    });
  });

  describe('retry', () => {
    it('repeats the last query after an error', async () => {
      const search = vi
        .fn<SearchFn>()
        .mockRejectedValueOnce(new HttpError(500))
        .mockResolvedValueOnce([spain]);
      const { controller, states } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.retry();
      await vi.advanceTimersByTimeAsync(0);

      expect(search).toHaveBeenCalledTimes(2);
      expect(search).toHaveBeenLastCalledWith('spain', expect.any(AbortSignal));
      expect(states.at(-1)).toEqual({ status: 'success', query: 'spain', countries: [spain] });
    });

    it('repeats the last typed query, not an older one', async () => {
      const search = vi.fn<SearchFn>().mockRejectedValue(new HttpError(500));
      const { controller } = setup(search);

      controller.input('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.input('italy');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.retry();
      await vi.advanceTimersByTimeAsync(0);

      expect(search).toHaveBeenLastCalledWith('italy', expect.any(AbortSignal));
    });

    it('does nothing when there was no query yet', async () => {
      const search = vi.fn<SearchFn>().mockResolvedValue([spain]);
      const { controller, states } = setup(search);

      controller.retry();
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).not.toHaveBeenCalled();
      expect(states).toEqual([]);
    });
  });
});
