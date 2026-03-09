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
  query GetProfile($steamId: String!, $after: String) {
    profile(query: $steamId) {
      ... on User {
        id
        username
        avatarUrl
        clipCount
        clips(first: 20, after: $after) {
          pageInfo { hasNextPage endCursor }
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
        clips(first: 20, after: $after) {
          pageInfo { hasNextPage endCursor }
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
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: GraphQLClipNode }[];
  };
}

interface GraphQLResponse {
  data?: {
    profile?: GraphQLProfile | null;
  };
  errors?: { message: string }[];
}

async function fetchProfilePage(
  steamId: string,
  after: string | null
): Promise<GraphQLProfile | null> {
  const res = await fetch(ALLSTAR_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://allstar.gg",
      Referer: "https://allstar.gg/",
    },
    body: JSON.stringify({
      query: PROFILE_QUERY,
      variables: { steamId, after },
    }),
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const json: GraphQLResponse = await res.json();
  return json?.data?.profile ?? null;
}

export async function getAllstarProfile(
  steamId: string
): Promise<AllstarProfile | null> {
  try {
    // Fetch first page to get profile metadata
    const first = await fetchProfilePage(steamId, null);
    if (!first) return null;

    const allNodes: GraphQLClipNode[] = [];

    const extractNodes = (profile: GraphQLProfile) =>
      (profile.clips?.edges ?? [])
        .map((e) => e.node)
        .filter(
          (n): n is GraphQLClipNode =>
            !!n && typeof n.shareId === "string" && n.shareId.length > 0
        );

    allNodes.push(...extractNodes(first));

    // Paginate through remaining pages (cap at 10 pages = 200 clips)
    let pageInfo = first.clips?.pageInfo;
    let page = 1;
    while (pageInfo?.hasNextPage && pageInfo.endCursor && page < 10) {
      const next = await fetchProfilePage(steamId, pageInfo.endCursor);
      if (!next) break;
      allNodes.push(...extractNodes(next));
      pageInfo = next.clips?.pageInfo;
      page++;
    }

    return {
      id: first.id,
      username: first.username,
      avatarUrl: first.avatarUrl,
      clipCount: first.clipCount ?? 0,
      clips: allNodes,
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
