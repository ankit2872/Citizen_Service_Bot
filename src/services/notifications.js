/**
 * Fetches real-time government notifications from English news sources.
 * Primary:  Times of India — India National News (always English)
 * Backup:   NDTV India News  (always English)
 * Fallback: Static English cards
 */

// Times of India — India section RSS (100% English)
const TOI_INDIA_URL   = 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms';
// NDTV India news RSS (100% English)
const NDTV_INDIA_URL  = 'https://feeds.feedburner.com/ndtvnews-india-news';

const toRSSAPI = (url) =>
  `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=10`;

const RSS_API         = toRSSAPI(TOI_INDIA_URL);
const RSS_API_BACKUP  = toRSSAPI(NDTV_INDIA_URL);

/**
 * Normalizes various RSS date strings into a valid JS Date.
 * Handles: RFC-2822, ISO 8601, and Indian locale formats.
 */
function parseRSSDate(dateStr) {
  if (!dateStr) return null;

  // Try direct parse first (works for ISO 8601 and clean RFC-2822)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try replacing IST / UTC offset strings that confuse some parsers
  const cleaned = dateStr
    .replace(/\s*IST\s*/gi, ' +0530')
    .replace(/\s*GMT\s*/gi, ' +0000');
  date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;

  // Try stripping the day-of-week prefix (e.g. "Sun, 29 Mar 2026 ...")
  const stripped = dateStr.replace(/^[A-Za-z]+,\s*/, '');
  date = new Date(stripped);
  if (!isNaN(date.getTime())) return date;

  return null;
}

/**
 * Formats a date string into a human-readable relative time.
 * e.g., "2 hours ago", "Yesterday", "3 days ago"
 */
export function formatRelativeTime(dateStr) {
  const date = parseRSSDate(dateStr);
  if (!date) return 'Recently';

  const now = new Date();
  const diffMs = now - date;

  // If date is in the future or invalid relative to now, show formatted date
  if (diffMs < 0) {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Maps a notification title/description to a theme color.
 */
function getNotificationColor(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('scheme') || lower.includes('yojana') || lower.includes('benefit')) return 'var(--accent)';
  if (lower.includes('health') || lower.includes('ayushman') || lower.includes('medical')) return '#10b981';
  if (lower.includes('finance') || lower.includes('budget') || lower.includes('rupee') || lower.includes('tax')) return 'var(--gold)';
  if (lower.includes('digital') || lower.includes('technology') || lower.includes('portal') || lower.includes('ai')) return '#22d3ee';
  if (lower.includes('agriculture') || lower.includes('farmer') || lower.includes('kisan')) return '#4ade80';
  return 'var(--secondary)';
}

/**
 * Strips HTML tags from a string.
 */
function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Fetches live government notifications (English only).
 * Priority: PIB English → News on Air English → Static fallback
 */
export async function fetchGovernmentNotifications() {
  const parseItems = (items) =>
    items.map((item) => {
      console.debug('[SevaBot Notif] raw pubDate:', item.pubDate, '| title:', item.title.substring(0, 40));
      const parsedDate = parseRSSDate(item.pubDate);
      return {
        id: item.guid || item.link || Math.random().toString(),
        title: stripHtml(item.title),
        description: stripHtml(item.description).substring(0, 200) + '...',
        date: item.pubDate,
        relativeTime: parsedDate
          ? formatRelativeTime(item.pubDate)
          : (item.pubDate ? item.pubDate.substring(0, 16) : 'Recently'),
        color: getNotificationColor(item.title),
        link: item.link || null,
      };
    });

  // --- Try PIB English ---
  try {
    const resp = await fetch(RSS_API, { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        console.info('[SevaBot Notif] Loaded PIB English feed:', data.items.length, 'items');
        return parseItems(data.items);
      }
    }
  } catch (e) {
    console.warn('[SevaBot Notif] PIB English feed failed:', e.message);
  }

  // --- Try News on Air English backup ---
  try {
    const resp2 = await fetch(RSS_API_BACKUP, { cache: 'no-store' });
    if (resp2.ok) {
      const data2 = await resp2.json();
      if (data2.status === 'ok' && Array.isArray(data2.items) && data2.items.length > 0) {
        console.info('[SevaBot Notif] Loaded News on Air backup:', data2.items.length, 'items');
        return parseItems(data2.items);
      }
    }
  } catch (e) {
    console.warn('[SevaBot Notif] News on Air backup failed:', e.message);
  }

  // --- Static English fallback ---
  console.warn('[SevaBot Notif] Using static fallback notifications');
  return [
    {
      id: 'fallback-1',
      title: 'System Maintenance Complete',
      description: 'SevaBot database has been updated with the latest government scheme details from the central portal.',
      date: new Date().toISOString(),
      relativeTime: 'Just now',
      color: 'var(--accent)',
      link: null,
    },
    {
      id: 'fallback-2',
      title: 'AI Engine Upgraded',
      description: "SevaBot is now powered by Gemini Flash. Expect faster and more accurate answers to your queries.",
      date: new Date(Date.now() - 86400000).toISOString(),
      relativeTime: 'Yesterday',
      color: '#10b981',
      link: null,
    },
    {
      id: 'fallback-3',
      title: 'PM Surya Ghar Muft Bijli Yojana',
      description: 'Details for the PM Surya Ghar Free Electricity Scheme have been added. Ask SevaBot about it!',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      relativeTime: '3 days ago',
      color: 'var(--secondary)',
      link: null,
    },
  ];
}
