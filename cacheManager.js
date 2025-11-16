const cache = new Map();

function getUsedChampions(guildId) {
  return cache.get(guildId) || new Set();
}

function addUsedChampions(guildId, champions) {
  const usedChampions = getUsedChampions(guildId);
  for (const champion of champions) {
    usedChampions.add(champion);
  }
  cache.set(guildId, usedChampions);
}

function resetUsedChampions(guildId) {
  cache.delete(guildId);
}

module.exports = {
  getUsedChampions,
  addUsedChampions,
  resetUsedChampions,
};
