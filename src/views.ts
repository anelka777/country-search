import { h } from './dom.js';
import type { Country } from './mapCountryResponse.js';
import type { SearchState } from './searchController.js';

const numberFormat = new Intl.NumberFormat('en-US');

type ErrorKind = Extract<SearchState, { status: 'error' }>['kind'];

const ERROR_MESSAGES: Record<ErrorKind, string> = {
  http: 'The server returned an error.',
  timeout: 'The server is taking too long to respond.',
  network: 'Network problem. Check your connection.',
};

export type ViewHandlers = {
  onRetry: () => void;
  onSelectCountry: (country: Country) => void;
};

export function renderCountryCard(country: Country, onSelect: (country: Country) => void) {
  const card = h(
    'button',
    { class: 'card', type: 'button' },
    h('img', {
      class: 'card__flag',
      src: country.flag,
      alt: `Flag of ${country.name}`,
      loading: 'lazy',
    }),
    h('span', { class: 'card__name' }, country.name),
    h('span', { class: 'card__meta' }, `Capital: ${country.capital ?? '—'}`),
    h('span', { class: 'card__meta' }, `Region: ${country.region}`),
    h('span', { class: 'card__meta' }, `Population: ${numberFormat.format(country.population)}`),
  );

  card.addEventListener('click', () => onSelect(country));
  return card;
}

function renderRow(label: string, value: string) {
  return h('div', { class: 'details__row' }, h('dt', {}, label), h('dd', {}, value));
}

function joinOrDash(items: string[]): string {
  return items.length > 0 ? items.join(', ') : '—';
}

export function renderCountryDetails(country: Country, onClose: () => void) {
  const closeButton = h('button', { class: 'details__close', type: 'button' }, 'Close');
  closeButton.addEventListener('click', onClose);

  return h(
    'article',
    { class: 'details__card' },
    h(
      'div',
      { class: 'details__header' },
      h('img', { class: 'details__flag', src: country.flag, alt: `Flag of ${country.name}` }),
      h('h2', {}, country.name),
      closeButton,
    ),
    h('p', {}, country.description),
    h(
      'dl',
      { class: 'details__list' },
      renderRow('Capital', country.capital ?? '—'),
      renderRow('Region', country.region),
      renderRow('Population', numberFormat.format(country.population)),
      renderRow('Area', country.area === null ? '—' : `${numberFormat.format(country.area)} km²`),
      renderRow('Languages', joinOrDash(country.languages)),
      renderRow('Currencies', joinOrDash(country.currencies)),
      renderRow('Borders', joinOrDash(country.borders)),
    ),
  );
}

export function renderState(state: SearchState, handlers: ViewHandlers): HTMLElement | null {
  switch (state.status) {
    case 'idle':
      return null;

    case 'loading':
      return h(
        'div',
        { class: 'status status--loading', role: 'status' },
        h('span', { class: 'spinner', 'aria-hidden': 'true' }),
        `Searching for “${state.query}”…`,
      );

    case 'empty':
      return h(
        'div',
        { class: 'status status--empty' },
        `Nothing found for “${state.query}”. Try another name.`,
      );

    case 'error': {
      const retryButton = h('button', { class: 'retry', type: 'button' }, 'Retry');
      retryButton.addEventListener('click', handlers.onRetry);

      return h(
        'div',
        { class: 'status status--error', role: 'alert' },
        h('p', {}, ERROR_MESSAGES[state.kind]),
        retryButton,
      );
    }

    case 'success':
      return h(
        'div',
        { class: 'grid' },
        ...state.countries.map((country) => renderCountryCard(country, handlers.onSelectCountry)),
      );
  }
}
