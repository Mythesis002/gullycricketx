export const schema = {
  project_id: "ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9",
  version: 1,
  tables: {
    users: {
      type: 'collection' as const,
      fields: {
        name: { type: 'string' as const, indexed: true },
        email: { type: 'string' as const, indexed: true },
        jerseyNumber: { type: 'string' as const, indexed: true },
        profilePicture: { type: 'string' as const, indexed: true },
        bio: { type: 'string' as const, indexed: true },
        matchesPlayed: { type: 'number' as const, indexed: true },
        totalRuns: { type: 'number' as const, indexed: true },
        totalWickets: { type: 'number' as const, indexed: true },
        battingAverage: { type: 'number' as const, indexed: true },
        strikeRate: { type: 'number' as const, indexed: true },
        bowlingAverage: { type: 'number' as const, indexed: true },
        economyRate: { type: 'number' as const, indexed: true },
        badges: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    posts: {
      type: 'collection' as const,
      fields: {
        userId: { type: 'string' as const, indexed: true },
        userName: { type: 'string' as const, indexed: true },
        jerseyNumber: { type: 'string' as const, indexed: true },
        text: { type: 'string' as const, indexed: true },
        imageUrl: { type: 'string' as const, indexed: true },
        likes: { type: 'number' as const, indexed: true },
        comments: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    teams: {
      type: 'collection' as const,
      fields: {
        name: { type: 'string' as const, indexed: true },
        captainId: { type: 'string' as const, indexed: true },
        captainName: { type: 'string' as const, indexed: true },
        playerIds: { type: 'string' as const, indexed: true },
        playerNames: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    matches: {
      type: 'collection' as const,
      fields: {
        teamAId: { type: 'string' as const, indexed: true },
        teamBId: { type: 'string' as const, indexed: true },
        teamAName: { type: 'string' as const, indexed: true },
        teamBName: { type: 'string' as const, indexed: true },
        date: { type: 'string' as const, indexed: true },
        time: { type: 'string' as const, indexed: true },
        venue: { type: 'string' as const, indexed: true },
        format: { type: 'string' as const, indexed: true },
        status: { type: 'string' as const, indexed: true },
        tossWinner: { type: 'string' as const, indexed: true },
        tossDecision: { type: 'string' as const, indexed: true },
        currentScore: { type: 'string' as const, indexed: true },
        currentOvers: { type: 'string' as const, indexed: true },
        battingTeam: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    matchAnalytics: {
      type: 'collection' as const,
      fields: {
        matchId: { type: 'string' as const, indexed: true },
        playerId: { type: 'string' as const, indexed: true },
        playerName: { type: 'string' as const, indexed: true },
        runs: { type: 'number' as const, indexed: true },
        ballsFaced: { type: 'number' as const, indexed: true },
        fours: { type: 'number' as const, indexed: true },
        sixes: { type: 'number' as const, indexed: true },
        wickets: { type: 'number' as const, indexed: true },
        oversBowled: { type: 'number' as const, indexed: true },
        runsConceded: { type: 'number' as const, indexed: true },
        status: { type: 'string' as const, indexed: true },
        captainAApproval: { type: 'boolean' as const, indexed: true },
        captainBApproval: { type: 'boolean' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    chatMessages: {
      type: 'collection' as const,
      fields: {
        matchId: { type: 'string' as const, indexed: true },
        userId: { type: 'string' as const, indexed: true },
        userName: { type: 'string' as const, indexed: true },
        jerseyNumber: { type: 'string' as const, indexed: true },
        message: { type: 'string' as const, indexed: true },
        imageUrl: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    tournaments: {
      type: 'collection' as const,
      fields: {
        name: { type: 'string' as const, indexed: true },
        creatorId: { type: 'string' as const, indexed: true },
        format: { type: 'string' as const, indexed: true },
        teamIds: { type: 'string' as const, indexed: true },
        matchIds: { type: 'string' as const, indexed: true },
        standings: { type: 'string' as const, indexed: true },
        status: { type: 'string' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    },
    notifications: {
      type: 'collection' as const,
      fields: {
        userId: { type: 'string' as const, indexed: true },
        title: { type: 'string' as const, indexed: true },
        message: { type: 'string' as const, indexed: true },
        type: { type: 'string' as const, indexed: true },
        read: { type: 'boolean' as const, indexed: true },
        createdAt: { type: 'number' as const, indexed: true }
      }
    }
  }
};
