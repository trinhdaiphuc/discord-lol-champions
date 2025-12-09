import championsData from "../../champions.json";

interface ChampionData {
  tags: string[];
  [key: string]: unknown;
}

const allChampions = Object.entries(championsData as Record<string, ChampionData>).map(
  ([name, champion]) => ({
    name,
    roles: champion.tags,
    roleCount: champion.tags?.length || 0,
  })
);

// Group by role count
const byRoleCount = new Map<number, string[]>();
allChampions.forEach(({ name, roleCount }) => {
  if (!byRoleCount.has(roleCount)) {
    byRoleCount.set(roleCount, []);
  }
  byRoleCount.get(roleCount)!.push(name);
});

console.log("Champions by role count distribution:\n");
const sortedCounts = Array.from(byRoleCount.keys()).sort((a, b) => b - a);
sortedCounts.forEach((count) => {
  if (count === 1) return; // Skip champions with only 1 role
  const champions = byRoleCount.get(count)!;
  console.log(`${count} roles: ${champions.length} champions`);
  champions.forEach((champion) => {
    console.log(`  - ${champion}: Roles - ${allChampions.find(c => c.name === champion)?.roles.join(", ")}`);
  });
});
