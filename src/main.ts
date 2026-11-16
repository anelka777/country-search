import { h } from './dom.js';
import { createSearchController } from './searchController.js';
import type { SearchController } from './searchController.js';
import { renderCountryDetails, renderState } from './views.js';

const searchInput = h('input', {
  class: 'search__input',
  type: 'search',
  placeholder: 'Search a country…',
  autocomplete: 'off',
  'aria-label': 'Country name',
});

const details = h('section', { class: 'details', 'aria-live': 'polite' });
const results = h('section', { class: 'results', 'aria-live': 'polite' });

document.body.append(
  h('main', { class: 'app' }, h('h1', {}, 'Country Search'), searchInput, details, results),
);

function closeDetails(): void {
  details.replaceChildren();
}

const controller: SearchController = createSearchController({
  onStateChange: (state) => {
    const view = renderState(state, {
      onRetry: () => controller.retry(),
      onSelectCountry: (country) => {
        details.replaceChildren(renderCountryDetails(country, closeDetails));
      },
    });

    results.replaceChildren(...(view ? [view] : []));
  },
});

searchInput.addEventListener('input', () => {
  closeDetails();
  controller.input(searchInput.value);
});
