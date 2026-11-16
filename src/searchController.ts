import { classifyError } from './classifyError.js';
import type { ErrorKind } from './classifyError.js';
import { debounce } from './debounce.js';
import type { Country } from './mapCountryResponse.js';
import { searchCountries } from './searchCountries.js';

const DEFAULT_DEBOUNCE_MS = 300;

export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; kind: Exclude<ErrorKind, 'cancelled'> };

export type SearchControllerOptions = {
  onStateChange: (state: SearchState) => void;
  search?: SearchFn;
  debounceMs?: number;
};

export type SearchController = {
  input: (text: string) => void;
  retry: () => void;
};

export function createSearchController(options: SearchControllerOptions): SearchController {
  const { onStateChange, search = searchCountries, debounceMs = DEFAULT_DEBOUNCE_MS } = options;

  let currentRequest: AbortController | undefined;
  let lastQuery = '';

  function cancelCurrentRequest(): void {
    currentRequest?.abort();
    currentRequest = undefined;
  }

  async function runSearch(query: string): Promise<void> {
    const request = new AbortController();
    currentRequest = request;
    onStateChange({ status: 'loading', query });

    try {
      const countries = await search(query, request.signal);
      onStateChange(
        countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query },
      );
    } catch (error) {
      const kind = classifyError(error);
      if (kind === 'cancelled') {
        return;
      }
      onStateChange({ status: 'error', query, kind });
    }
  }

  const debouncedSearch = debounce((query: string) => {
    void runSearch(query);
  }, debounceMs);

  function input(text: string): void {
    cancelCurrentRequest();

    const query = text.trim();
    lastQuery = query;

    if (query === '') {
      debouncedSearch.cancel();
      onStateChange({ status: 'idle' });
      return;
    }

    debouncedSearch(query);
  }

  function retry(): void {
    if (lastQuery === '') {
      return;
    }
    debouncedSearch.cancel();
    cancelCurrentRequest();
    void runSearch(lastQuery);
  }

  return { input, retry };
}
