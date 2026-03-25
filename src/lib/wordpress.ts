const WORDPRESS_API_URL = import.meta.env.WORDPRESS_API_URL || 'https://www.talem.eu/blog/graphql';

// ============================================
// TYPY
// ============================================

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  formattedDate: string;
  content: string;
  excerpt: string;
  category: string;
  featuredImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
}

// ============================================
// FUNKCJE POMOCNICZE
// ============================================

function formatPolishDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

async function fetchGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(WORDPRESS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`WordPress GraphQL error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

// ============================================
// ZAPYTANIA GRAPHQL
// ============================================

const POST_FIELDS = `
  databaseId
  title
  slug
  date
  content
  excerpt
  categories {
    nodes {
      name
    }
  }
  featuredImage {
    node {
      sourceUrl
      altText
      mediaDetails {
        width
        height
      }
    }
  }
`;

// ============================================
// MAPOWANIE
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(node: any): BlogPost {
  const img = node.featuredImage?.node;
  return {
    id: String(node.databaseId),
    title: stripHtml(node.title ?? ''),
    slug: node.slug,
    date: node.date,
    formattedDate: formatPolishDate(node.date),
    content: node.content ?? '',
    excerpt: stripHtml(node.excerpt ?? ''),
    category: node.categories?.nodes?.[0]?.name ?? '',
    featuredImage: img
      ? {
          url: img.sourceUrl,
          alt: img.altText || stripHtml(node.title ?? ''),
          width: img.mediaDetails?.width ?? 1200,
          height: img.mediaDetails?.height ?? 630,
        }
      : undefined,
  };
}

// ============================================
// GŁÓWNE FUNKCJE API
// ============================================

export async function getLatestPosts(count: number = 3): Promise<BlogPost[]> {
  try {
    const data = await fetchGraphQL<{ posts: { nodes: unknown[] } }>(`
      query GetLatestPosts($first: Int!) {
        posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
          nodes {
            ${POST_FIELDS}
          }
        }
      }
    `, { first: count });

    return data.posts.nodes.map(mapPost);
  } catch (error) {
    console.error('Error fetching latest WordPress posts:', error);
    return [];
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const data = await fetchGraphQL<{ posts: { nodes: unknown[] } }>(`
      query GetAllPosts {
        posts(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
          nodes {
            ${POST_FIELDS}
          }
        }
      }
    `);

    return data.posts.nodes.map(mapPost);
  } catch (error) {
    console.error('Error fetching all WordPress posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const data = await fetchGraphQL<{ postBy: unknown }>(`
      query GetPostBySlug($slug: String!) {
        postBy(slug: $slug) {
          ${POST_FIELDS}
        }
      }
    `, { slug });

    if (!data.postBy) return null;
    return mapPost(data.postBy);
  } catch (error) {
    console.error('Error fetching WordPress post by slug:', error);
    return null;
  }
}
