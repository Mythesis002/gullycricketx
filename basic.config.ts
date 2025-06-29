export const schema = {
  "tables": {
    "posts": {
      "type": "collection",
      "fields": {
        "text": {
          "type": "string",
          "indexed": true
        },
        "likes": {
          "type": "number",
          "indexed": true
        },
        "shares": {
          "type": "number",
          "indexed": true
        },
        "userId": {
          "type": "string",
          "indexed": true
        },
        "comments": {
          "type": "string",
          "indexed": true
        },
        "hashtags": {
          "type": "string",
          "indexed": true
        },
        "imageUrl": {
          "type": "string",
          "indexed": true
        },
        "location": {
          "type": "string",
          "indexed": true
        },
        "postType": {
          "type": "string",
          "indexed": true
        },
        "userName": {
          "type": "string",
          "indexed": true
        },
        "videoUrl": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "jerseyNumber": {
          "type": "string",
          "indexed": true
        },
        "taggedPlayers": {
          "type": "string",
          "indexed": true
        }
      }
    },
    "teams": {
      "type": "collection",
      "fields": {
        "name": {
          "type": "string",
          "indexed": true
        },
        "captainId": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "playerIds": {
          "type": "string",
          "indexed": true
        },
        "captainName": {
          "type": "string",
          "indexed": true
        },
        "playerNames": {
          "type": "string",
          "indexed": true
        }
      }
    },
    "users": {
      "type": "collection",
      "fields": {
        "bio": {
          "type": "string",
          "indexed": true
        },
        "name": {
          "type": "string",
          "indexed": true
        },
        "email": {
          "type": "string",
          "indexed": true
        },
        "badges": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "totalRuns": {
          "type": "number",
          "indexed": true
        },
        "strikeRate": {
          "type": "number",
          "indexed": true
        },
        "economyRate": {
          "type": "number",
          "indexed": true
        },
        "jerseyNumber": {
          "type": "string",
          "indexed": true
        },
        "totalWickets": {
          "type": "number",
          "indexed": true
        },
        "matchesPlayed": {
          "type": "number",
          "indexed": true
        },
        "battingAverage": {
          "type": "number",
          "indexed": true
        },
        "bowlingAverage": {
          "type": "number",
          "indexed": true
        },
        "profilePicture": {
          "type": "string",
          "indexed": true
        }
      }
    },
    "matches": {
      "type": "collection",
      "fields": {
        "date": {
          "type": "string",
          "indexed": true
        },
        "time": {
          "type": "string",
          "indexed": true
        },
        "overs": {
          "type": "string",
          "indexed": true
        },
        "title": {
          "type": "string",
          "indexed": true
        },
        "venue": {
          "type": "string",
          "indexed": true
        },
        "format": {
          "type": "string",
          "indexed": true
        },
        "status": {
          "type": "string",
          "indexed": true
        },
        "teamAId": {
          "type": "string",
          "indexed": true
        },
        "teamBId": {
          "type": "string",
          "indexed": true
        },
        "ballType": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "creatorId": {
          "type": "string",
          "indexed": true
        },
        "matchType": {
          "type": "string",
          "indexed": true
        },
        "teamAName": {
          "type": "string",
          "indexed": true
        },
        "teamBName": {
          "type": "string",
          "indexed": true
        },
        "tossWinner": {
          "type": "string",
          "indexed": true
        },
        "battingTeam": {
          "type": "string",
          "indexed": true
        },
        "currentOvers": {
          "type": "string",
          "indexed": true
        },
        "currentScore": {
          "type": "string",
          "indexed": true
        },
        "teamAPlayers": {
          "type": "string",
          "indexed": true
        },
        "teamBPlayers": {
          "type": "string",
          "indexed": true
        },
        "tossDecision": {
          "type": "string",
          "indexed": true
        },
        "playersPerTeam": {
          "type": "number",
          "indexed": true
        }
      }
    },
    "tournaments": {
      "type": "collection",
      "fields": {
        "name": {
          "type": "string",
          "indexed": true
        },
        "format": {
          "type": "string",
          "indexed": true
        },
        "status": {
          "type": "string",
          "indexed": true
        },
        "teamIds": {
          "type": "string",
          "indexed": true
        },
        "matchIds": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "creatorId": {
          "type": "string",
          "indexed": true
        },
        "standings": {
          "type": "string",
          "indexed": true
        }
      }
    },
    "chatMessages": {
      "type": "collection",
      "fields": {
        "userId": {
          "type": "string",
          "indexed": true
        },
        "matchId": {
          "type": "string",
          "indexed": true
        },
        "message": {
          "type": "string",
          "indexed": true
        },
        "imageUrl": {
          "type": "string",
          "indexed": true
        },
        "userName": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "jerseyNumber": {
          "type": "string",
          "indexed": true
        }
      }
    },
    "notifications": {
      "type": "collection",
      "fields": {
        "read": {
          "type": "boolean",
          "indexed": true
        },
        "type": {
          "type": "string",
          "indexed": true
        },
        "title": {
          "type": "string",
          "indexed": true
        },
        "userId": {
          "type": "string",
          "indexed": true
        },
        "message": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        }
      }
    },
    "matchAnalytics": {
      "type": "collection",
      "fields": {
        "runs": {
          "type": "number",
          "indexed": true
        },
        "fours": {
          "type": "number",
          "indexed": true
        },
        "sixes": {
          "type": "number",
          "indexed": true
        },
        "status": {
          "type": "string",
          "indexed": true
        },
        "matchId": {
          "type": "string",
          "indexed": true
        },
        "wickets": {
          "type": "number",
          "indexed": true
        },
        "playerId": {
          "type": "string",
          "indexed": true
        },
        "createdAt": {
          "type": "number",
          "indexed": true
        },
        "ballsFaced": {
          "type": "number",
          "indexed": true
        },
        "playerName": {
          "type": "string",
          "indexed": true
        },
        "oversBowled": {
          "type": "number",
          "indexed": true
        },
        "runsConceded": {
          "type": "number",
          "indexed": true
        },
        "captainAApproval": {
          "type": "boolean",
          "indexed": true
        },
        "captainBApproval": {
          "type": "boolean",
          "indexed": true
        }
      }
    }
  },
  "version": 4,
  "project_id": "ed2d765b-98bc-43ad-a0b0-05eb9e6bfed9"
};