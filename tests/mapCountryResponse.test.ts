import { describe, expect, it } from 'vitest';
import spainResponse from './fixtures/spain.json';
import { mapCountryResponse } from '../src/mapCountryResponse.js';
import type { RawCountry } from '../src/mapCountryResponse.js';

const [rawSpain] = spainResponse;

if (!rawSpain) {
  throw new Error('Fixture spain.json must contain at least one country');
}

describe('mapCountryResponse', () => {
  describe('main fields', () => {
    it('maps basic card fields', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.name).toBe('Spain');
      expect(country.capital).toBe('Madrid');
      expect(country.region).toBe('Europe');
      expect(country.population).toBe(47351567);
    });

    it('uses svg flag url', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.flag).toBe('https://flagcdn.com/es.svg');
    });

    it('maps languages to a list of names', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.languages).toEqual(['Spanish']);
    });

    it('formats currencies with symbol', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.currencies).toEqual(['Euro (€)']);
    });

    it('keeps borders as country codes', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
    });

    it('maps area as a number', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.area).toBe(505992);
    });

    it('builds a description from name and subregion', () => {
      const country = mapCountryResponse(rawSpain);

      expect(country.description).toBe('Spain is a country in Southern Europe.');
    });
  });

  describe('missing optional data', () => {
    it('returns null capital when capital is missing', () => {
      const raw: RawCountry = { ...rawSpain, capital: undefined };

      const country = mapCountryResponse(raw);

      expect(country.capital).toBeNull();
    });

    it('returns null area when area is missing', () => {
      const raw: RawCountry = { ...rawSpain, area: undefined };

      const country = mapCountryResponse(raw);

      expect(country.area).toBeNull();
    });

    it('returns empty arrays when lists are missing', () => {
      const raw: RawCountry = {
        ...rawSpain,
        languages: undefined,
        currencies: undefined,
        borders: undefined,
      };

      const country = mapCountryResponse(raw);

      expect(country.languages).toEqual([]);
      expect(country.currencies).toEqual([]);
      expect(country.borders).toEqual([]);
    });

    it('uses region in description when subregion is missing', () => {
      const raw: RawCountry = { ...rawSpain, subregion: undefined };

      const country = mapCountryResponse(raw);

      expect(country.description).toBe('Spain is a country in Europe.');
    });

    it('formats currency without symbol as just its name', () => {
      const raw: RawCountry = {
        ...rawSpain,
        currencies: [{ code: 'EUR', name: 'Euro' }],
      };

      const country = mapCountryResponse(raw);

      expect(country.currencies).toEqual(['Euro']);
    });
  });

  describe('purity', () => {
    it('does not mutate the input', () => {
      const snapshot = structuredClone(rawSpain);

      mapCountryResponse(rawSpain);

      expect(rawSpain).toEqual(snapshot);
    });
  });
});
