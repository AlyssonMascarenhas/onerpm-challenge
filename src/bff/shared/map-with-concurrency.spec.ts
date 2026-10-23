// @vitest-environment node
import { mapWithConcurrency } from './map-with-concurrency';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

describe('mapWithConcurrency', () => {
  it('returns results in input order even when tasks finish out of order', async () => {
    const delays = [30, 1, 15];

    const results = await mapWithConcurrency(delays, 3, async (delay) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return delay * 2;
    });

    expect(results).toEqual([60, 2, 30]);
  });

  it('never runs more than `limit` tasks at the same time', async () => {
    let running = 0;
    let peak = 0;

    await mapWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async () => {
        peak = Math.max(peak, ++running);
        await tick();
        running--;
      },
    );

    expect(peak).toBe(3);
  });

  it('handles an empty list and a limit larger than the list', async () => {
    await expect(mapWithConcurrency([], 5, async (n: number) => n)).resolves.toEqual([]);
    await expect(mapWithConcurrency([1, 2], 10, async (n) => n + 1)).resolves.toEqual([2, 3]);
  });

  it('rejects when a task rejects', async () => {
    const run = mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) {
        throw new Error('boom');
      }
      return n;
    });

    await expect(run).rejects.toThrow('boom');
  });
});
