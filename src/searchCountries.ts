import { HttpError } from './httpError.js';
import { mapCountryResponse } from './mapCountryResponse.js';
import type { Country, RawCountry } from './mapCountryResponse.js';

const API_URL = 'https://countries.dev/name';
const NOT_FOUND = 404;
const DEFAULT_TIMEOUT_MS = 8000;

export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Country[]> {
  const url = `${API_URL}/${encodeURIComponent(query.trim())}`;
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const response = await fetch(url, { signal: requestSignal });

  if (response.status === NOT_FOUND) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const data = (await response.json()) as RawCountry[];
  return data.map(mapCountryResponse);
}
