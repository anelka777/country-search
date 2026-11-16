import { afterEach, describe, expect, it, vi } from 'vitest';
import spainResponse from './fixtures/spain.json';
import { HttpError } from '../src/httpError.js';
import { searchCountries } from '../src/searchCountries.js';
import { classifyError } from '../src/classifyError.js';

const signal = new AbortController().signal;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockAbortableFetch() {
  const fetchMock = vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const requestSignal = init?.signal;
        if (!requestSignal) return;
        if (requestSignal.aborted) {
          reject(requestSignal.reason);
          return;
        }
        requestSignal.addEventListener('abort', () => reject(requestSignal.reason), {
          once: true,
        });
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HttpError', () => {
  it('is an Error that keeps the response status', () => {
    const error = new HttpError(503);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(503);
  });

  it('has a readable name and message', () => {
    const error = new HttpError(500);

    expect(error.name).toBe('HttpError');
    expect(error.message).toContain('500');
  });
});

describe('searchCountries', () => {
  describe('request', () => {
    it('requests countries.dev by name', async () => {
      const fetchMock = mockFetch(jsonResponse(spainResponse));

      await searchCountries('spain', signal);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/spain');
    });

    it('encodes special characters in the query', async () => {
      const fetchMock = mockFetch(jsonResponse(spainResponse));

      await searchCountries('a/b c', signal);

      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/a%2Fb%20c');
    });

    it('trims whitespace around the query', async () => {
      const fetchMock = mockFetch(jsonResponse(spainResponse));

      await searchCountries('  spain  ', signal);

      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://countries.dev/name/spain');
    });
  });

  describe('successful response', () => {
    it('returns mapped countries', async () => {
      mockFetch(jsonResponse(spainResponse));

      const countries = await searchCountries('spain', signal);

      expect(countries).toHaveLength(1);
      expect(countries[0]?.name).toBe('Spain');
      expect(countries[0]?.capital).toBe('Madrid');
      expect(countries[0]?.flag).toBe('https://flagcdn.com/es.svg');
    });
  });

  describe('404 means no matches', () => {
    it('returns an empty array instead of throwing', async () => {
      mockFetch(jsonResponse({ message: 'Not Found' }, 404));

      const countries = await searchCountries('qqqqqqq', signal);

      expect(countries).toEqual([]);
    });
  });

  describe('real errors', () => {
    it.each([400, 429, 500, 503])('throws HttpError for status %i', async (status) => {
      mockFetch(jsonResponse({ message: 'error' }, status));

      const error = await searchCountries('spain', signal).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(status);
    });

    it('lets network errors through unchanged', async () => {
      const networkError = new TypeError('Failed to fetch');
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(networkError));

      const error = await searchCountries('spain', signal).catch((e: unknown) => e);

      expect(error).toBe(networkError);
      expect(error).not.toBeInstanceOf(HttpError);
    });
  });

  describe('cancellation', () => {
    it('rejects with AbortError when the signal is aborted', async () => {
      mockAbortableFetch();
      const controller = new AbortController();

      const promise = searchCountries('spain', controller.signal);
      controller.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('rejects immediately if the signal is already aborted', async () => {
      mockAbortableFetch();
      const controller = new AbortController();
      controller.abort();

      await expect(searchCountries('spain', controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
    });
  });
  describe('timeout', () => {
    it('rejects with TimeoutError when the server does not respond in time', async () => {
      mockAbortableFetch();

      await expect(searchCountries('spain', signal, 10)).rejects.toMatchObject({
        name: 'TimeoutError',
      });
    }, 500);

    it('is classified as a timeout, not as a cancellation', async () => {
      mockAbortableFetch();

      const error = await searchCountries('spain', signal, 10).catch((e: unknown) => e);

      expect(classifyError(error)).toBe('timeout');
    }, 500);

    it('keeps reporting AbortError for its own cancellation when a timeout is set', async () => {
      mockAbortableFetch();
      const controller = new AbortController();

      const promise = searchCountries('spain', controller.signal, 1000);
      controller.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('does not time out when the response arrives in time', async () => {
      mockFetch(jsonResponse(spainResponse));

      const countries = await searchCountries('spain', signal, 1000);

      expect(countries).toHaveLength(1);
    });
  });
});
