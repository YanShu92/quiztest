export function roundReady(data, roundId) {
  return !!roundId && data?.status === 'syncing' && data.currentQuestion?.roundId === roundId &&
    Object.entries(data.teams || {}).filter(([, team]) => team?.name)
      .every(([slot]) => data.ready?.[slot] === roundId);
}
