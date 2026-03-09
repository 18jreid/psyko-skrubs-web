const ALLSTAR_GRAPHQL = "https://api.prod.allstar.dev/graphql";

export interface AllstarClip {
  id: string;
  shareId: string;
  title: string;
  thumbnailUrl: string;
  game: string;
  createdAt: string;
  views: number;
}

export interface AllstarProfile {
  id: string;
  username?: string;
  avatarUrl: string;
  clipCount: number;
  clips: AllstarClip[];
  steamId: string;
}

const PROFILE_QUERY = `
  query GetProfile($steamId: String!) {
    profile(query: $steamId) {
      ... on User {
        id
        username
        avatarUrl
        clipCount
        clips(first: 20) {
          edges {
            node {
              id
              shareId
              title
              thumbnailUrl(style: STANDARD)
              game
              createdAt
              views
            }
          }
        }
      }
      ... on UnclaimedProfile {
        id
        avatarUrl
        clipCount
        clips(first: 20) {
          edges {
            node {
              id
              shareId
              title
              thumbnailUrl(style: STANDARD)
              game
              createdAt
              views
            }
          }
        }
      }
    }
  }
`;

interface GraphQLClipNode {
  id: string;
  shareId: string;
  title: string;
  thumbnailUrl: string;
  game: string;
  createdAt: string;
  views: number;
}

interface GraphQLProfile {
  id: string;
  username?: string;
  avatarUrl: string;
  clipCount: number;
  clips: {
    edges: { node: GraphQLClipNode }[];
  };
}

interface GraphQLResponse {
  data?: {
    profile?: GraphQLProfile | null;
  };
  errors?: { message: string }[];
}

export async function getAllstarProfile(
  steamId: string
): Promise<AllstarProfile | null> {
  try {
    const res = await fetch(ALLSTAR_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: PROFILE_QUERY, variables: { steamId } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const json: GraphQLResponse = await res.json();
    const profile = json?.data?.profile;
    if (!profile) return null;

    const clips: AllstarClip[] =
      profile.clips?.edges
        ?.map((e) => e.node)
        .filter(
          (n): n is GraphQLClipNode =>
            !!n &&
            typeof n.shareId === "string" &&
            n.shareId.length > 0
        ) ?? [];

    return {
      id: profile.id,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      clipCount: profile.clipCount ?? 0,
      clips,
      steamId,
    };
  } catch {
    return null;
  }
}

export interface AllstarClipWithUser extends AllstarClip {
  username: string;
  userAvatar: string;
  steamId: string;
}

export async function getAllstarClips(
  steamIds: string[]
): Promise<AllstarClipWithUser[]> {
  if (steamIds.length === 0) return [];

  const results = await Promise.allSettled(
    steamIds.map((id) => getAllstarProfile(id))
  );

  const allClips: AllstarClipWithUser[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const profile = result.value;
    for (const clip of profile.clips) {
      allClips.push({
        ...clip,
        username: profile.username ?? "Unknown",
        userAvatar: profile.avatarUrl,
        steamId: profile.steamId,
      });
    }
  }

  allClips.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allClips;
}

export function allstarClipUrl(shareId: string): string {
  return `https://allstar.gg/clip/${shareId}`;
}

export function allstarEmbedUrl(shareId: string): string {
  return `https://allstar.gg/clip/${shareId}?embed=true`;
}
