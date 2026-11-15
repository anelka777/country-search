import { describe, expect, it } from 'vitest';
import { classifyError } from '../src/classifyError.js';
import { HttpError } from '../src/httpError.js';

describe('classifyError', () => {
  it('classifies AbortError as cancelled', () => {
    const error = new DOMException('The operation was aborted', 'AbortError');

    expect(classifyError(error)).toBe('cancelled');
  });

  it('classifies TimeoutError as timeout', () => {
    const error = new DOMException('The operation timed out', 'TimeoutError');

    expect(classifyError(error)).toBe('timeout');
  });

  it('does not confuse AbortError and TimeoutError', () => {
    const aborted = classifyError(new DOMException('aborted', 'AbortError'));
    const timedOut = classifyError(new DOMException('timed out', 'TimeoutError'));

    expect(aborted).not.toBe(timedOut);
  });

  it('classifies HttpError as http', () => {
    expect(classifyError(new HttpError(500))).toBe('http');
  });

  it('classifies a failed network request as network', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it.each([['some text'], [42], [null], [undefined]])(
    'classifies non-error value %j as network',
    (value) => {
      expect(classifyError(value)).toBe('network');
    },
  );

  it('recognizes the reason of a manually aborted controller', () => {
    const controller = new AbortController();
    controller.abort();

    expect(classifyError(controller.signal.reason)).toBe('cancelled');
  });

  it('recognizes the reason of a timed out signal', async () => {
    const signal = AbortSignal.timeout(1);
    await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));

    expect(classifyError(signal.reason)).toBe('timeout');
  });
});
