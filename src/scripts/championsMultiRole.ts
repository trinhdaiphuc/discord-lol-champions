import championsData from "../../champions.json";

interface ChampionData {
  tags: string[];
  [key: string]: unknown;
}

const championsByMultipleRoles = Object.entries(championsData as Record<string, ChampionData>)
  .filter(([_, champion]) => champion.tags && champion.tags.length > 2)
  .map(([name, champion]) => ({
    name,
    roles: champion.tags,
    roleCount: champion.tags.length,
  }));

console.log(
  `Champions with more than 2 roles (${championsByMultipleRoles.length} total):\n`
);
championsByMultipleRoles.forEach(({ name, roles, roleCount }) => {
  console.log(`${name}: ${roles.join(", ")} (${roleCount} roles)`);
});
