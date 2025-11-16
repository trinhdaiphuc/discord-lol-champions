function createRandomTeams(members) {
  const totalPlayers = 10;
  const memberNames = [...members];

  while (memberNames.length < totalPlayers) {
    memberNames.push(`World-${memberNames.length + 1 - members.length}`);
  }

  const shuffledMembers = memberNames.sort(() => 0.5 - Math.random());

  const teamA = [];
  const teamB = [];

  shuffledMembers.forEach((member, index) => {
    if (index % 2 === 0) {
      teamA.push(member);
    } else {
      teamB.push(member);
    }
  });

  return { teamA, teamB };
}

module.exports = { createRandomTeams };
