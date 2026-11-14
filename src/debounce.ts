export type Debounced<Args extends unknown[]> = ((...args: Args) => void) & {
  cancel: () => void;
};

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args): void => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };

  debounced.cancel = (): void => {
    clearTimeout(timerId);
    timerId = undefined;
  };

  return debounced;
}
