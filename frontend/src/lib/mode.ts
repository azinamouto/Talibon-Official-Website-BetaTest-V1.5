/** Runtime records must come from live services. Fixtures belong in test servers. */
export function isMockAllowed(): boolean { return false; }
export function assertProductionOrThrow(message: string, _technicalDetails?: unknown): never {
  throw new Error(message);
}
