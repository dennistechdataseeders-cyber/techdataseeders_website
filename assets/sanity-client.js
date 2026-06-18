// Sanity client for fetching blog posts from Sanity CMS
const SANITY_PROJECT_ID = 'e29wm4hj';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2024-01-01';
const SANITY_QUERY_ENDPOINT = `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;

window.SanityClient = {
  // Fetch all published blog posts from Sanity
  async fetchPublished() {
    try {
      const query = encodeURIComponent(`*[_type == "post" && published == true] | order(date desc) {
        _id,
        title,
        "slug": slug.current,
        category,
        excerpt,
        body,
        author,
        date,
        readTime,
        heroImage,
        tags
      }`);

      const response = await fetch(`${SANITY_QUERY_ENDPOINT}?query=${query}`);
      const data = await response.json();

      if (data.result && Array.isArray(data.result)) {
        return data.result;
      }
      return [];
    } catch (error) {
      console.error('Error fetching from Sanity:', error);
      return [];
    }
  },

  // Fetch a single blog post by slug
  async fetchBySlug(slug) {
    try {
      const query = encodeURIComponent(`*[_type == "post" && slug.current == "${slug}"] {
        _id,
        title,
        "slug": slug.current,
        category,
        excerpt,
        body,
        author,
        date,
        readTime,
        heroImage,
        tags
      }[0]`);

      const response = await fetch(`${SANITY_QUERY_ENDPOINT}?query=${query}`);
      const data = await response.json();

      return data.result || null;
    } catch (error) {
      console.error('Error fetching post from Sanity:', error);
      return null;
    }
  }
};
