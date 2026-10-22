/**
 * Production analytics tracker for user sessions and telemetry
 * Records page views and candidate logins with session deduplication
 */

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  totalLogins: number;
  uniqueLoggedInUsers: number;
  activeUsersList: Array<{
    id: string;
    name: string;
    email: string;
    lastActive: string;
    format: string;
    targetBand: number;
  }>;
  recentPageViews: Array<{
    path: string;
    timestamp: number;
    userAgent?: string;
  }>;
  recentLoginEvents: Array<{
    userId: string;
    name: string;
    email: string;
    timestamp: number;
  }>;
  lastUpdated: string;
}

const VISITOR_ID_KEY = 'ielts_dev_visitor_id_v1';
const LOCAL_VISITS_KEY = 'ielts_local_visit_count_v1';
const LOCAL_LAST_VISIT_TIME_KEY = 'ielts_local_last_visit_time_v1';

export function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return 'v_anonymous_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Record a visit / pageview
 */
export async function trackVisit(pagePath: string = window.location.pathname || '/'): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  
  // Track locally in localStorage as well
  try {
    const cur = parseInt(localStorage.getItem(LOCAL_VISITS_KEY) || '0', 10);
    localStorage.setItem(LOCAL_VISITS_KEY, String(cur + 1));
    localStorage.setItem(LOCAL_LAST_VISIT_TIME_KEY, String(Date.now()));
  } catch {}

  try {
    await fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path: pagePath,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        timestamp: Date.now()
      })
    });
  } catch {
    // Offline or silent failure
  }
}

/**
 * Record a login event
 */
export async function trackLogin(user: { id: string; name: string; email: string }): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ielts_session_token_v2') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    await fetch('/api/analytics/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visitorId,
        userId: user.id,
        name: user.name,
        email: user.email,
        timestamp: Date.now()
      })
    });
  } catch {
    // Offline or silent failure
  }
}

/**
 * Fetch stats for the administrative analytics dashboard
 */
export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  try {
    const res = await fetch('/api/analytics/stats');
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
