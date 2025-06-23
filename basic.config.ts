export const schema = {
  project_id: "ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9",
  version: 1,
  tables: {
    users: {
      type: 'collection',
      fields: {
        name: { type: 'string', indexed: true },
        email: { type: 'string', indexed: true },
        jerseyNumber: { type: 'string', indexed: true },
        profilePicture: { type: 'string', indexed: true },
        bio: { type: 'string', indexed: true },
        matchesPlayed: { type: 'number', indexed: true },
        totalRuns: { type: 'number', indexed: true },
        totalWickets: { type: 'number', indexed: true },
        battingAverage: { type: 'number', indexed: true },
        strikeRate: { type: 'number', indexed: true },
        bowlingAverage: { type: 'number', indexed: true },
        economyRate: { type: 'number', indexed: true },
        badges: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    posts: {
      type: 'collection',
      fields: {
        userId: { type: 'string', indexed: true },
        userName: { type: 'string', indexed: true },
        jerseyNumber: { type: 'string', indexed: true },
        text: { type: 'string', indexed: true },
        imageUrl: { type: 'string', indexed: true },
        likes: { type: 'number', indexed: true },
        comments: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    teams: {
      type: 'collection',
      fields: {
        name: { type: 'string', indexed: true },
        captainId: { type: 'string', indexed: true },
        captainName: { type: 'string', indexed: true },
        playerIds: { type: 'string', indexed: true },
        playerNames: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    matches: {
      type: 'collection',
      fields: {
        teamAId: { type: 'string', indexed: true },
        teamBId: { type: 'string', indexed: true },
        teamAName: { type: 'string', indexed: true },
        teamBName: { type: 'string', indexed: true },
        date: { type: 'string', indexed: true },
        time: { type: 'string', indexed: true },
        venue: { type: 'string', indexed: true },
        format: { type: 'string', indexed: true },
        status: { type: 'string', indexed: true },
        tossWinner: { type: 'string', indexed: true },
        tossDecision: { type: 'string', indexed: true },
        currentScore: { type: 'string', indexed: true },
        currentOvers: { type: 'string', indexed: true },
        battingTeam: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    matchAnalytics: {
      type: 'collection',
      fields: {
        matchId: { type: 'string', indexed: true },
        playerId: { type: 'string', indexed: true },
        playerName: { type: 'string', indexed: true },
        runs: { type: 'number', indexed: true },
        ballsFaced: { type: 'number', indexed: true },
        fours: { type: 'number', indexed: true },
        sixes: { type: 'number', indexed: true },
        wickets: { type: 'number', indexed: true },
        oversBowled: { type: 'number', indexed: true },
        runsConceded: { type: 'number', indexed: true },
        status: { type: 'string', indexed: true },
        captainAApproval: { type: 'boolean', indexed: true },
        captainBApproval: { type: 'boolean', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    chatMessages: {
      type: 'collection',
      fields: {
        matchId: { type: 'string', indexed: true },
        userId: { type: 'string', indexed: true },
        userName: { type: 'string', indexed: true },
        jerseyNumber: { type: 'string', indexed: true },
        message: { type: 'string', indexed: true },
        imageUrl: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    tournaments: {
      type: 'collection',
      fields: {
        name: { type: 'string', indexed: true },
        creatorId: { type: 'string', indexed: true },
        format: { type: 'string', indexed: true },
        teamIds: { type: 'string', indexed: true },
        matchIds: { type: 'string', indexed: true },
        standings: { type: 'string', indexed: true },
        status: { type: 'string', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    },
    notifications: {
      type: 'collection',
      fields: {
        userId: { type: 'string', indexed: true },
        title: { type: 'string', indexed: true },
        message: { type: 'string', indexed: true },
        type: { type: 'string', indexed: true },
        read: { type: 'boolean', indexed: true },
        createdAt: { type: 'number', indexed: true }
      }
    }
  }
};
