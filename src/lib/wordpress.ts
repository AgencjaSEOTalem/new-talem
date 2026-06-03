// ============================================
// WORDPRESS GRAPHQL CLIENT
// ============================================

const GRAPHQL_ENDPOINT = 'https://api.talem.eu/graphql';

// ============================================
// GRAPHQL RESPONSE INTERFACES
// ============================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

// Shared ACF types
interface GraphQLACFImage {
  node?: {
    sourceUrl?: string;
    altText?: string;
    mediaDetails?: {
      width?: number;
      height?: number;
    };
  };
}

interface GraphQLProfilAutora {
  ekspertyza?: string | null;
  cytat?: string | null;
  rola?: string | null;
  zdjecie?: GraphQLACFImage | null;
}

interface GraphQLPostNode {
  databaseId: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
      mediaDetails: {
        width: number;
        height: number;
      };
    };
  };
  author: {
    node: {
      name: string;
      slug: string;
      description: string;
      avatar: {
        url: string;
      };
      profilAutora?: GraphQLProfilAutora;
    };
  };
  categories: {
    nodes: Array<{
      databaseId: number;
      name: string;
      slug: string;
      count: number;
    }>;
  };
  rating?: {
    average: number;
    count: number;
  };
  keyInformation?: {
    keyInformation?: string;
  };
}

interface GraphQLCategoryNode {
  databaseId: number;
  name: string;
  slug: string;
  count: number;
}

interface GraphQLUserNode {
  databaseId: number;
  name: string;
  slug: string;
  description: string;
  avatar: {
    url: string;
  };
  profilAutora?: GraphQLProfilAutora;
}

// ============================================
// EXPORTED INTERFACES (zachowane dla kompatybilności)
// ============================================

export interface BlogPost {
  id: number;
  databaseId: number; // Potrzebne dla ocen
  title: string;
  excerpt: string;
  content?: string;
  slug: string;
  date: string;
  formattedDate: string;
  author: string;
  authorSlug: string;
  authorExpertise?: string;
  authorPhoto?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  readingTime: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  featuredImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  rating?: {
    average: number;
    count: number;
  };
  keyInformation?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface Author {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar: {
    small: string;
    medium: string;
    large: string;
  };
  postsCount?: number;
  expertise?: string;
  quote?: string;
  role?: string;
  photo?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPolishDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function calculateReadingTime(content: string): string {
  const text = stripHtml(content);
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.ceil(words / 200);

  if (minutes === 1) return '1 min czytania';
  return `${minutes} min czytania`;
}

function transformACFPhoto(
  acfImage: GraphQLACFImage | null | undefined,
  fallbackAlt: string
): { url: string; alt: string; width?: number; height?: number } | undefined {
  if (!acfImage?.node?.sourceUrl) return undefined;

  return {
    url: acfImage.node.sourceUrl,
    alt: acfImage.node.altText || fallbackAlt,
    width: acfImage.node.mediaDetails?.width,
    height: acfImage.node.mediaDetails?.height,
  };
}

// ============================================
// BASE GRAPHQL FETCH FUNCTION
// ============================================

async function fetchGraphQL<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL HTTP error: ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(`GraphQL Error: ${result.errors[0].message}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL');
    }

    return result.data;
  } catch (error) {
    console.error('GraphQL Fetch Error:', error);
    throw error;
  }
}

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

function transformPost(node: GraphQLPostNode): BlogPost {
  const readingTime = calculateReadingTime(node.content || node.excerpt);

  // Konwertuj absolutne URL-e na względne ścieżki
  const transformContent = (content: string | undefined): string | undefined => {
    if (!content) return content;
    // Zamień https://www.talem.eu/blog/ i https://talem.eu/blog/ na /blog/
    return content
      .replace(/https?:\/\/(www\.)?talem\.eu\/blog\//g, '/blog/')
      .replace(/https?:\/\/(www\.)?talem\.eu\//g, '/');
  };

  return {
    id: node.databaseId,
    databaseId: node.databaseId,
    title: stripHtml(node.title),
    excerpt: stripHtml(node.excerpt),
    content: transformContent(node.content),
    slug: node.slug,
    date: node.date,
    formattedDate: formatPolishDate(node.date),
    author: node.author.node.name,
    authorSlug: node.author.node.slug,
    authorExpertise: node.author.node.profilAutora?.ekspertyza || undefined,
    authorPhoto: transformACFPhoto(node.author.node.profilAutora?.zdjecie, node.author.node.name),
    readingTime,
    categories: node.categories.nodes.map(cat => ({
      id: cat.databaseId,
      name: cat.name,
      slug: cat.slug,
    })),
    featuredImage: node.featuredImage?.node ? {
      url: node.featuredImage.node.sourceUrl,
      alt: node.featuredImage.node.altText || stripHtml(node.title),
      width: node.featuredImage.node.mediaDetails?.width,
      height: node.featuredImage.node.mediaDetails?.height,
    } : undefined,
    rating: node.rating ? {
      average: node.rating.average || 0,
      count: node.rating.count || 0,
    } : undefined,
    keyInformation: node.keyInformation?.keyInformation,
  };
}

// ============================================
// GRAPHQL QUERIES
// ============================================

const POST_FRAGMENT = `
  fragment PostFields on Post {
    databaseId
    slug
    title
    excerpt
    content
    date
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
    author {
      node {
        name
        slug
        description
        avatar {
          url
        }
        profilAutora {
          ekspertyza
          zdjecie {
            node {
              sourceUrl
              altText
              mediaDetails {
                width
                height
              }
            }
          }
        }
      }
    }
    categories {
      nodes {
        databaseId
        name
        slug
        count
      }
    }
    rating {
      average
      count
    }
    keyInformation {
      keyInformation
    }
  }
`;

// ============================================
// PUBLIC API FUNCTIONS
// ============================================

/**
 * Pobiera wszystkie wpisy (max 1000)
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const query = `
    ${POST_FRAGMENT}
    query GetAllPosts {
      posts(first: 1000, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          ...PostFields
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ posts: { nodes: GraphQLPostNode[] } }>(query);
    return data.posts.nodes.map(transformPost);
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
}

/**
 * Pobiera pojedynczy post po slug (z oceną)
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const query = `
    ${POST_FRAGMENT}
    query GetPostBySlug($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        ...PostFields
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ post: GraphQLPostNode | null }>(query, { slug });

    if (!data.post) {
      return null;
    }

    return transformPost(data.post);
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return null;
  }
}

/**
 * Pobiera wszystkie kategorie (pomija "Uncategorized")
 */
export async function getAllCategories(): Promise<Category[]> {
  const query = `
    query GetAllCategories {
      categories(first: 100, where: { orderby: COUNT, order: DESC, hideEmpty: true }) {
        nodes {
          databaseId
          name
          slug
          count
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ categories: { nodes: GraphQLCategoryNode[] } }>(query);

    return data.categories.nodes
      .filter(cat =>
        cat.slug !== 'uncategorized' &&
        cat.slug !== 'bez-kategorii' &&
        cat.count > 0
      )
      .map(cat => ({
        id: cat.databaseId,
        name: cat.name,
        slug: cat.slug,
        count: cat.count,
      }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Pobiera pojedynczą kategorię po slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const query = `
    query GetCategoryBySlug($slug: ID!) {
      category(id: $slug, idType: SLUG) {
        databaseId
        name
        slug
        count
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ category: GraphQLCategoryNode | null }>(query, { slug });

    if (!data.category) {
      return null;
    }

    return {
      id: data.category.databaseId,
      name: data.category.name,
      slug: data.category.slug,
      count: data.category.count,
    };
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

/**
 * Pobiera wpisy z danej kategorii
 */
export async function getPostsByCategory(categorySlug: string): Promise<BlogPost[]> {
  const query = `
    ${POST_FRAGMENT}
    query GetPostsByCategory($categorySlug: String!) {
      posts(first: 1000, where: { categoryName: $categorySlug, orderby: { field: DATE, order: DESC } }) {
        nodes {
          ...PostFields
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ posts: { nodes: GraphQLPostNode[] } }>(query, { categorySlug });
    return data.posts.nodes.map(transformPost);
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    return [];
  }
}

/**
 * Pobiera wszystkich autorów
 */
export async function getAllAuthors(): Promise<Author[]> {
  const query = `
    query GetAllAuthors {
      users(first: 100) {
        nodes {
          databaseId
          name
          slug
          description
          avatar {
            url
          }
          profilAutora {
            ekspertyza
            cytat
            rola
            zdjecie {
              node {
                sourceUrl
                altText
                mediaDetails {
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ users: { nodes: GraphQLUserNode[] } }>(query);

    return data.users.nodes.map(user => ({
      id: user.databaseId,
      name: user.name,
      slug: user.slug,
      description: user.description || '',
      avatar: {
        small: user.avatar.url,
        medium: user.avatar.url,
        large: user.avatar.url,
      },
      expertise: user.profilAutora?.ekspertyza || undefined,
      quote: user.profilAutora?.cytat || undefined,
      role: user.profilAutora?.rola || undefined,
      photo: transformACFPhoto(user.profilAutora?.zdjecie, user.name),
    }));
  } catch (error) {
    console.error('Error fetching authors:', error);
    return [];
  }
}

/**
 * Pobiera pojedynczego autora po slug
 */
export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const query = `
    query GetAuthorBySlug($slug: ID!) {
      user(id: $slug, idType: SLUG) {
        databaseId
        name
        slug
        description
        avatar {
          url
        }
        profilAutora {
          ekspertyza
          cytat
          rola
          zdjecie {
            node {
              sourceUrl
              altText
              mediaDetails {
                width
                height
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ user: GraphQLUserNode | null }>(query, { slug });

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.databaseId,
      name: data.user.name,
      slug: data.user.slug,
      description: data.user.description || '',
      avatar: {
        small: data.user.avatar.url,
        medium: data.user.avatar.url,
        large: data.user.avatar.url,
      },
      expertise: data.user.profilAutora?.ekspertyza || undefined,
      quote: data.user.profilAutora?.cytat || undefined,
      role: data.user.profilAutora?.rola || undefined,
      photo: data.user.profilAutora?.zdjecie?.node?.sourceUrl ? {
        url: data.user.profilAutora.zdjecie.node.sourceUrl,
        alt: data.user.profilAutora.zdjecie.node.altText || data.user.name,
        width: data.user.profilAutora.zdjecie.node.mediaDetails?.width,
        height: data.user.profilAutora.zdjecie.node.mediaDetails?.height,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching author:', error);
    return null;
  }
}

/**
 * Pobiera wpisy danego autora
 */
export async function getPostsByAuthor(authorSlug: string): Promise<BlogPost[]> {
  const query = `
    ${POST_FRAGMENT}
    query GetPostsByAuthor($authorSlug: String!) {
      posts(first: 1000, where: { authorName: $authorSlug, orderby: { field: DATE, order: DESC } }) {
        nodes {
          ...PostFields
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ posts: { nodes: GraphQLPostNode[] } }>(query, { authorSlug });
    return data.posts.nodes.map(transformPost);
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return [];
  }
}

/**
 * Dodaje ocenę do wpisu (GraphQL Mutation)
 */
export async function submitPostRating(postId: number, rating: number): Promise<{ averageRating: number; ratingCount: number } | null> {
  const mutation = `
    mutation SubmitRating($postId: Int!, $rating: Int!) {
      submitPostRating(
        input: {
          postId: $postId
          rating: $rating
        }
      ) {
        averageRating
        ratingCount
      }
    }
  `;

  try {
    const data = await fetchGraphQL<{ submitPostRating: { averageRating: number; ratingCount: number } }>(mutation, {
      postId,
      rating,
    });

    return data.submitPostRating;
  } catch (error) {
    console.error('Error submitting rating:', error);
    return null;
  }
}

// ============================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================

/**
 * @deprecated Użyj getAllPosts() zamiast tego
 */
export async function getPosts(
  perPage: number = 100,
  page: number = 1,
  categoryId?: number,
  authorId?: number
): Promise<BlogPost[]> {
  // Ta funkcja jest zachowana dla kompatybilności wstecznej
  // Teraz pobiera wszystkie posty i filtruje lokalnie
  let posts = await getAllPosts();

  if (categoryId) {
    posts = posts.filter(post =>
      post.categories.some(cat => cat.id === categoryId)
    );
  }

  if (authorId) {
    // Dla authorId filtrowanie wymaga dodatkowego zapytania lub lokalnego cache
    // Na razie zwróć wszystkie posty
    console.warn('authorId filtering in getPosts is deprecated, use getPostsByAuthor()');
  }

  return posts;
}

/**
 * @deprecated Użyj getAllPosts() zamiast tego
 */
export async function getLatestPosts(count: number = 3): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.slice(0, count);
}

/**
 * @deprecated Użyj getAllCategories() zamiast tego
 */
export async function getCategories(): Promise<Category[]> {
  return getAllCategories();
}

/**
 * @deprecated Użyj getAllAuthors() zamiast tego
 */
export async function getAuthors(): Promise<Author[]> {
  return getAllAuthors();
}
