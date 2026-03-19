/**
 * WordPress API Integration
 * 
 * Konfiguracja:
 * 1. Zmień WORDPRESS_API_URL na URL swojego WordPressa (z /wp-json/wp/v2)
 * 2. Opcjonalnie dostosuj interfejsy do struktury swoich postów
 */

// ============================================
// KONFIGURACJA - ZMIEŃ NA SWOJE DANE
// ============================================
const WORDPRESS_API_URL = 'https://www.talem.eu/wp-json/wp/v2';

// ============================================
// TYPY I INTERFEJSY
// ============================================
export interface WordPressPost {
  id: number;
  date: string;
  slug: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  link: string;
  _embedded?: {
    author?: Array<{
      name: string;
      avatar_urls?: {
        [key: string]: string;
      };
    }>;
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
  };
  // Alternatywnie: Yoast SEO reading time
  yoast_head_json?: {
    twitter_misc?: {
      'Szacowany czas czytania'?: string;
    };
  };
}

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  slug: string;
  link: string;
  date: string;
  formattedDate: string;
  author: string;
  featuredImage?: {
    url: string;
    alt: string;
  };
}

// ============================================
// FUNKCJE POMOCNICZE
// ============================================

/**
 * Formatuje datę na polski format
 */
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

/**
 * Usuwa tagi HTML z tekstu
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}


// ============================================
// GŁÓWNA FUNKCJA API
// ============================================

/**
 * Pobiera ostatnie wpisy z WordPress
 * 
 * @param count - liczba wpisów do pobrania (domyślnie 3)
 * @returns Promise<BlogPost[]>
 */
export async function getLatestPosts(count: number = 3): Promise<BlogPost[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?per_page=${count}&_embed=1&orderby=date&order=desc`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Cache na 5 minut (300 sekund)
        // Astro automatycznie cachuje requesty w build time
      }
    );

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }

    const posts: WordPressPost[] = await response.json();

    return posts.map((post): BlogPost => {
      const author = post._embedded?.author?.[0]?.name || 'Talem';
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];

      return {
        id: post.id,
        title: stripHtml(post.title.rendered),
        excerpt: stripHtml(post.excerpt.rendered),
        slug: post.slug,
        link: post.link,
        date: post.date,
        formattedDate: formatPolishDate(post.date),
        author,
        featuredImage: featuredMedia ? {
          url: featuredMedia.source_url,
          alt: featuredMedia.alt_text || stripHtml(post.title.rendered),
        } : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);

    // Zwróć puste dane w przypadku błędu
    // Możesz też zwrócić placeholder posts dla development
    return [];
  }
}

/**
 * Pobiera pojedynczy post po slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?slug=${slug}&_embed=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }

    const posts: WordPressPost[] = await response.json();

    if (posts.length === 0) {
      return null;
    }

    const post = posts[0];
    const author = post._embedded?.author?.[0]?.name || 'Talem';
    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];

    return {
      id: post.id,
      title: stripHtml(post.title.rendered),
      excerpt: stripHtml(post.excerpt.rendered),
      slug: post.slug,
      link: post.link,
      date: post.date,
      formattedDate: formatPolishDate(post.date),
      author,
      featuredImage: featuredMedia ? {
        url: featuredMedia.source_url,
        alt: featuredMedia.alt_text || stripHtml(post.title.rendered),
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching WordPress post:', error);
    return null;
  }
}
