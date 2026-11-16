export type RawCountry = {
  name: string;
  flags: { png: string; svg: string };
  capital?: string;
  region: string;
  subregion?: string;
  population: number;
  area?: number;
  borders?: string[];
  languages?: { name: string }[];
  currencies?: { code: string; name: string; symbol?: string }[];
};

export type Country = {
  name: string;
  flag: string;
  capital: string | null;
  region: string;
  population: number;
  languages: string[];
  currencies: string[];
  area: number | null;
  borders: string[];
  description: string;
};

type RawCurrency = NonNullable<RawCountry['currencies']>[number];

function formatCurrency(currency: RawCurrency): string {
  return currency.symbol ? `${currency.name} (${currency.symbol})` : currency.name;
}

function buildDescription(raw: RawCountry): string {
  const place = raw.subregion ?? raw.region;
  return `${raw.name} is a country in ${place}.`;
}

export function mapCountryResponse(raw: RawCountry): Country {
  return {
    name: raw.name,
    flag: raw.flags.svg,
    capital: raw.capital ?? null,
    region: raw.region,
    population: raw.population,
    languages: (raw.languages ?? []).map((language) => language.name),
    currencies: (raw.currencies ?? []).map(formatCurrency),
    area: raw.area ?? null,
    borders: [...(raw.borders ?? [])],
    description: buildDescription(raw),
  };
}
