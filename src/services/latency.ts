/** Simulated network latency so loading states are exercised realistically. */
export const delay = <T,>(value: T, ms = 320): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const simulateLatency = (ms = 320): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const clone = <T,>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);

