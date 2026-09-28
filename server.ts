import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ORIGIN = 'https://maktabkhooneh.org';
const SESSION_FILE = path.resolve(process.cwd(), 'session.json');
const DOWNLOAD_DIR = path.resolve(process.cwd(), 'download');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Session & Cookie Store Helpers
// ==========================================
interface UserSession {
  cookie: string;
  updated: string;
  email?: string;
  profile?: any;
}

interface SessionData {
  users: Record<string, UserSession>;
  lastUsed: string;
}

async function readSession(): Promise<SessionData> {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const txt = await fs.promises.readFile(SESSION_FILE, 'utf8');
      const data = JSON.parse(txt);
      if (data && data.users) {
        return data;
      }
      if (data && typeof data.cookie === 'string') {
        return {
          users: {
            default: { cookie: data.cookie, updated: data.updated || new Date().toISOString() },
          },
          lastUsed: 'default',
        };
      }
    }
  } catch (err) {
    console.error('[Session] Error reading session file:', err);
  }

  // Fallback to environment variable if set
  if (process.env.MK_COOKIE && process.env.MK_COOKIE.trim()) {
    return {
      users: {
        env_user: {
          cookie: process.env.MK_COOKIE.trim(),
          updated: new Date().toISOString(),
        },
      },
      lastUsed: 'env_user',
    };
  }

  return { users: {}, lastUsed: '' };
}

async function writeSession(data: SessionData): Promise<void> {
  try {
    await fs.promises.writeFile(SESSION_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Session] Error saving session file:', err);
  }
}

async function getActiveCookie(): Promise<string | null> {
  if (process.env.MK_COOKIE && process.env.MK_COOKIE.trim()) {
    return process.env.MK_COOKIE.trim();
  }
  if (process.env.MK_COOKIE_FILE && fs.existsSync(process.env.MK_COOKIE_FILE)) {
    try {
      const c = fs.readFileSync(process.env.MK_COOKIE_FILE, 'utf8').trim();
      if (c) return c;
    } catch {}
  }

  const session = await readSession();
  const lastKey = session.lastUsed;
  if (lastKey && session.users[lastKey]?.cookie) {
    return session.users[lastKey].cookie;
  }
  const firstUser = Object.values(session.users)[0];
  return firstUser?.cookie || null;
}

function toAsciiHeader(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  let encoded = val;
  try {
    encoded = encodeURI(decodeURI(val));
  } catch {
    try {
      encoded = encodeURI(val);
    } catch {
      encoded = val.replace(/[^\x00-\xFF]/g, '');
    }
  }
  // Enforce ByteString constraint: every character must have charCode <= 255
  return encoded.replace(/[^\x00-\xFF]/g, '');
}

function commonHeaders(cookie: string | null, referer?: string) {
  const headers: Record<string, string> = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9,fa;q=0.8',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'x-requested-with': 'XMLHttpRequest',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
  };
  if (cookie && cookie !== 'PUT_YOUR_COOKIE_HERE') {
    headers['cookie'] = cookie.replace(/[^\x00-\xFF]/g, '');
  }
  if (referer) {
    headers['referer'] = toAsciiHeader(referer);
  }
  return headers;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let safeUrl = url;
    try {
      safeUrl = new URL(url).href;
    } catch {
      safeUrl = encodeURI(decodeURI(url));
    }
    const res = await fetch(safeUrl, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Minimal Cookie Store for login flow
class SimpleCookieStore {
  map = new Map<string, string>();
  setCookieLine(line?: string) {
    if (!line) return;
    const seg = line.split(';')[0];
    const eq = seg.indexOf('=');
    if (eq === -1) return;
    const k = seg.slice(0, eq).trim();
    const v = seg.slice(eq + 1).trim();
    if (k) this.map.set(k, v);
  }
  applySetCookie(arr?: string[] | string) {
    if (!arr) return;
    if (Array.isArray(arr)) {
      arr.forEach((l) => this.setCookieLine(l));
    } else {
      this.setCookieLine(arr);
    }
  }
  get(name: string) {
    return this.map.get(name);
  }
  headerString() {
    return Array.from(this.map.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

function rawRequest(
  urlStr: string,
  { method = 'GET', headers = {}, body = null }: { method?: string; headers?: Record<string, string>; body?: string | null } = {}
): Promise<{ status: number; headers: any; body: string }> {
  const u = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      protocol: u.protocol,
      headers,
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function sanitizeName(name: string) {
  return (name || '')
    .replace(/[\/:*?"<>|]/g, ' ')
    .replace(/[\s\u200c\u200f\u202a\u202b]+/g, ' ')
    .trim()
    .slice(0, 150);
}

function decodeHtmlEntities(str: string) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractCourseSlug(courseUrl: string): string {
  try {
    const rawTrimmed = courseUrl.trim();
    const safeUrl = toAsciiHeader(rawTrimmed);
    const parsed = new URL(safeUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const lmsIdx = parts.indexOf('lms');
    if (lmsIdx !== -1 && parts[lmsIdx + 1] === 'course' && parts[lmsIdx + 2]) {
      return decodeURIComponent(parts[lmsIdx + 2]);
    }
    const idx = parts.indexOf('course');
    if (idx === -1 || !parts[idx + 1]) throw new Error('Cannot parse course slug from URL');
    return decodeURIComponent(parts[idx + 1]);
  } catch (e: any) {
    throw new Error('Invalid course URL: ' + e.message);
  }
}

function extractCourseIdFromSlug(slug: string): number | null {
  if (!slug) return null;
  const m = slug.match(/-mk(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

// Fetch Core Data (verify authentication)
async function fetchCoreData(cookie: string | null) {
  const url = `${ORIGIN}/api/v1/general/core-data/?profile=1`;
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: commonHeaders(cookie, ORIGIN),
  });
  if (!res.ok) {
    throw new Error(`Core-data request failed with status: ${res.status}`);
  }
  return res.json();
}

// ==========================================
// API Routes
// ==========================================

// 1. Session Status & Profiles
app.get('/api/auth/status', async (_req: Request, res: Response) => {
  try {
    const session = await readSession();
    const activeCookie = await getActiveCookie();

    let coreData = null;
    let isAuthenticated = false;
    let authError = null;

    if (activeCookie) {
      try {
        coreData = await fetchCoreData(activeCookie);
        isAuthenticated = !!coreData?.auth?.details?.is_authenticated;
      } catch (e: any) {
        authError = e.message;
      }
    }

    res.json({
      activeUser: session.lastUsed || (Object.keys(session.users)[0] ?? null),
      users: Object.entries(session.users).map(([email, u]) => ({
        email,
        updated: u.updated,
        isActive: email === session.lastUsed,
      })),
      hasCookie: !!activeCookie,
      cookiePreview: activeCookie ? `${activeCookie.slice(0, 15)}...${activeCookie.slice(-10)}` : null,
      isAuthenticated,
      coreData,
      authError,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login with Email + Password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const store = new SimpleCookieStore();
    const UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

    // Step 0: Get initial CSRF from login page
    const r0 = await rawRequest(`${ORIGIN}/accounts/login/`, {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    store.applySetCookie(r0.headers['set-cookie']);

    let csrf = store.get('csrftoken') || null;
    if (!csrf) {
      const rFallback = await rawRequest(`${ORIGIN}/api/v1/general/core-data/?profile=1`, {
        method: 'GET',
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      store.applySetCookie(rFallback.headers['set-cookie']);
      try {
        const jFallback = JSON.parse(rFallback.body);
        csrf = jFallback?.auth?.csrf || store.get('csrftoken') || null;
      } catch {}
    }

    if (!csrf) {
      return res.status(500).json({ error: 'Could not obtain initial CSRF token from Maktabkhooneh.' });
    }

    const addCsrfHeaders = (h: Record<string, string> = {}) => ({
      ...h,
      'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrf!,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/accounts/login/`,
    });

    // Step 1: Check active user
    const formCheck = new URLSearchParams();
    formCheck.append('csrfmiddlewaretoken', csrf);
    formCheck.append('tessera', email);
    formCheck.append('g-recaptcha-response', '');

    const rCheck = await rawRequest(`${ORIGIN}/api/v1/auth/check-active-user`, {
      method: 'POST',
      headers: addCsrfHeaders({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: store.headerString(),
      }),
      body: formCheck.toString(),
    });
    store.applySetCookie(rCheck.headers['set-cookie']);

    let jCheck: any = null;
    try {
      jCheck = JSON.parse(rCheck.body);
    } catch {}

    if (!jCheck || jCheck.status !== 'success') {
      const msg = jCheck?.message || `check-active-user failed with status ${rCheck.status}`;
      return res.status(401).json({ error: msg });
    }

    if (jCheck.message !== 'get-pass') {
      return res.status(400).json({
        error: `Unexpected login flow state: ${jCheck.message}. (Maktabkhooneh requires password flow)`,
      });
    }

    // Step 2: Login authentication
    const formLogin = new URLSearchParams();
    formLogin.append('csrfmiddlewaretoken', csrf);
    formLogin.append('tessera', email);
    formLogin.append('hidden_username', email);
    formLogin.append('password', password);
    formLogin.append('g-recaptcha-response', '');

    const rLogin = await rawRequest(`${ORIGIN}/api/v1/auth/login-authentication`, {
      method: 'POST',
      headers: addCsrfHeaders({
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: store.headerString(),
      }),
      body: formLogin.toString(),
    });
    store.applySetCookie(rLogin.headers['set-cookie']);

    let jLogin: any = null;
    try {
      jLogin = JSON.parse(rLogin.body);
    } catch {}

    if (!jLogin || jLogin.status !== 'success') {
      const msg = jLogin?.message || 'Login failed. Please verify your email and password.';
      return res.status(401).json({ error: msg });
    }

    const sessionid = store.get('sessionid');
    const finalCsrf = store.get('csrftoken') || csrf;
    if (!sessionid) {
      return res.status(500).json({ error: 'Session cookie not received from Maktabkhooneh.' });
    }

    const cookieString = `csrftoken=${finalCsrf}; sessionid=${sessionid}`;

    // Verify session immediately
    const coreData = await fetchCoreData(cookieString);

    // Save to session.json
    const session = await readSession();
    const key = email.trim().toLowerCase();
    session.users[key] = {
      cookie: cookieString,
      updated: new Date().toISOString(),
      email: key,
      profile: coreData,
    };
    session.lastUsed = key;
    await writeSession(session);

    res.json({
      success: true,
      message: 'Logged in successfully',
      email: key,
      coreData,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login error occurred' });
  }
});

// 3. Set Manual Cookie
app.post('/api/auth/set-cookie', async (req: Request, res: Response) => {
  const { cookie, label = 'manual_cookie' } = req.body;
  if (!cookie || typeof cookie !== 'string' || !cookie.trim()) {
    return res.status(400).json({ error: 'Cookie string is required' });
  }

  const cleanCookie = cookie.trim();
  try {
    const coreData = await fetchCoreData(cleanCookie);
    const isAuthenticated = !!coreData?.auth?.details?.is_authenticated;
    const email = coreData?.auth?.details?.email || label;

    const session = await readSession();
    const key = email.toLowerCase();
    session.users[key] = {
      cookie: cleanCookie,
      updated: new Date().toISOString(),
      email: key,
      profile: coreData,
    };
    session.lastUsed = key;
    await writeSession(session);

    res.json({
      success: true,
      isAuthenticated,
      email: key,
      coreData,
    });
  } catch (err: any) {
    res.status(400).json({ error: `Cookie validation failed: ${err.message}` });
  }
});

// 4. Switch Active User
app.post('/api/auth/switch-user', async (req: Request, res: Response) => {
  const { email } = req.body;
  const session = await readSession();
  if (!session.users[email]) {
    return res.status(404).json({ error: 'User session not found' });
  }
  session.lastUsed = email;
  await writeSession(session);
  res.json({ success: true, activeUser: email });
});

// 5. Delete Stored User Session
app.delete('/api/auth/user/:email', async (req: Request, res: Response) => {
  const email = (Array.isArray(req.params.email) ? req.params.email[0] : req.params.email) as string;
  const session = await readSession();
  if (email) {
    delete session.users[email];
    if (session.lastUsed === email) {
      session.lastUsed = Object.keys(session.users)[0] || '';
    }
    await writeSession(session);
  }
  res.json({ success: true, remainingUsers: Object.keys(session.users) });
});

// 6. Course Outline Fetcher
app.post('/api/course/outline', async (req: Request, res: Response) => {
  const { courseUrl } = req.body;
  if (!courseUrl || typeof courseUrl !== 'string') {
    return res.status(400).json({ error: 'courseUrl is required' });
  }

  try {
    const normalizedUrl = courseUrl.trim().endsWith('/') ? courseUrl.trim() : `${courseUrl.trim()}/`;
    const courseSlug = extractCourseSlug(normalizedUrl);
    const courseId = extractCourseIdFromSlug(courseSlug);
    const isLmsFormat = /\/lms\/course\//.test(normalizedUrl);
    const activeCookie = await getActiveCookie();

    let chaptersData: any = null;
    let usedApi = 'legacy';

    // Try LMS outline API first if course ID is available
    if (courseId) {
      try {
        const apiUrl = `${ORIGIN}/api/v1/lms/courses/${courseId}/outline/`;
        const r = await fetchWithTimeout(apiUrl, {
          method: 'GET',
          headers: commonHeaders(activeCookie, normalizedUrl),
        });
        if (r.ok) {
          const json = await r.json();
          if (Array.isArray(json?.chapters)) {
            chaptersData = json;
            usedApi = 'lms';
          }
        }
      } catch {}
    }

    // Fallback to legacy chapters API
    if (!chaptersData) {
      const safeSlug = encodeURIComponent(decodeURIComponent(courseSlug));
      const apiUrl = `${ORIGIN}/api/v1/courses/${safeSlug}/chapters/`;
      const r = await fetchWithTimeout(apiUrl, {
        method: 'GET',
        headers: commonHeaders(activeCookie, normalizedUrl),
      });
      if (!r.ok) {
        throw new Error(`Failed to fetch course chapters: HTTP ${r.status} ${r.statusText}`);
      }
      chaptersData = await r.json();
      usedApi = 'legacy';
    }

    const rawChapters: any[] = Array.isArray(chaptersData?.chapters) ? chaptersData.chapters : [];
    if (rawChapters.length === 0) {
      return res.status(404).json({
        error: 'No chapters found for this course. Please verify the URL or ensure you have valid login credentials.',
      });
    }

    // Detect format from units
    const firstUnit = (rawChapters[0]?.units || rawChapters[0]?.unit_set || [])[0];
    const isNewFormat = firstUnit ? typeof firstUnit.type === 'number' : isLmsFormat;

    let totalLectures = 0;
    let totalOtherUnits = 0;

    const formattedChapters = rawChapters.map((ch, chIdx) => {
      const unitsRaw: any[] = Array.isArray(ch.units) ? ch.units : Array.isArray(ch.unit_set) ? ch.unit_set : [];
      const formattedUnits = unitsRaw.map((u, uIdx) => {
        const isVideo = isNewFormat ? u.type === 1 : u.type === 'lecture';
        if (isVideo) totalLectures++;
        else totalOtherUnits++;

        // Access/lock status
        // New API: u.view_access (10: free, 20: enrolled, 30: purchased, 40: subscription)
        // Old API: u.locked
        const isLocked = u.locked === true;
        const viewAccess = u.view_access;

        return {
          id: u.id || u.unit_id || `${chIdx + 1}-${uIdx + 1}`,
          title: u.title || u.slug || `Unit ${uIdx + 1}`,
          slug: u.slug || '',
          order: uIdx + 1,
          type: u.type,
          isVideo,
          isLocked,
          viewAccess,
          duration: u.duration || u.time || null,
          hasCaption: !!u.has_caption,
          description: u.description || '',
        };
      });

      return {
        id: ch.id || chIdx + 1,
        title: ch.title || ch.slug || `Chapter ${chIdx + 1}`,
        slug: ch.slug || '',
        order: chIdx + 1,
        unitsCount: formattedUnits.length,
        lecturesCount: formattedUnits.filter((u) => u.isVideo).length,
        units: formattedUnits,
      };
    });

    res.json({
      courseSlug,
      courseId,
      displayName: sanitizeName(decodeURIComponent(courseSlug)),
      courseUrl: normalizedUrl,
      isNewFormat,
      usedApi,
      totalChapters: formattedChapters.length,
      totalLectures,
      totalOtherUnits,
      chapters: formattedChapters,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing course outline' });
  }
});

// 7. Unit Details & Video Qualities Inspector
app.post('/api/course/unit-details', async (req: Request, res: Response) => {
  const { unitId, courseUrl, courseSlug, chapter, unit, isNewFormat = true } = req.body;
  const activeCookie = await getActiveCookie();

  try {
    let videoUrlData: any = null;
    let unitDetails: any = null;
    let qualities: Array<{ resolution: number; download_url: string; label?: string }> = [];
    let bestDownloadUrl: string | null = null;
    let captionFile: string | null = null;
    let attachments: Array<{ name: string; download_url: string; size?: number }> = [];

    if (isNewFormat && unitId) {
      // New LMS API: video_url + unit details
      const [vRes, dRes] = await Promise.all([
        fetchWithTimeout(`${ORIGIN}/api/v1/lms/units/${unitId}/video_url/`, {
          headers: commonHeaders(activeCookie, courseUrl),
        }).catch(() => null),
        fetchWithTimeout(`${ORIGIN}/api/v1/lms/units/${unitId}/`, {
          headers: commonHeaders(activeCookie, courseUrl),
        }).catch(() => null),
      ]);

      if (vRes && vRes.ok) {
        videoUrlData = await vRes.json();
        if (Array.isArray(videoUrlData?.qualities)) {
          qualities = videoUrlData.qualities.map((q: any) => ({
            resolution: q.resolution || 0,
            download_url: q.download_url,
            label: `${q.resolution || 'Auto'}p`,
          }));
          qualities.sort((a, b) => b.resolution - a.resolution);
        }
        if (qualities.length > 0 && qualities[0].download_url) {
          bestDownloadUrl = qualities[0].download_url;
        } else if (videoUrlData?.video_urls?.hq) {
          bestDownloadUrl = videoUrlData.video_urls.hq;
          qualities.push({ resolution: 720, download_url: videoUrlData.video_urls.hq, label: 'HQ' });
        } else if (videoUrlData?.video_urls?.lq) {
          bestDownloadUrl = videoUrlData.video_urls.lq;
          qualities.push({ resolution: 360, download_url: videoUrlData.video_urls.lq, label: 'LQ' });
        }
      }

      if (dRes && dRes.ok) {
        unitDetails = await dRes.json();
        if (unitDetails?.has_caption && unitDetails?.caption_file) {
          captionFile = unitDetails.caption_file;
        }
        if (Array.isArray(unitDetails?.resources)) {
          attachments = unitDetails.resources
            .filter((r: any) => r && r.type !== 1 && r.download_url)
            .map((r: any) => ({
              name: r.name || r.file_name || 'attachment',
              download_url: r.download_url,
              size: r.size,
            }));
        }
      }
    } else {
      // Legacy scrape from HTML page
      let lectureUrl = courseUrl;
      if (chapter && unit && courseSlug) {
        const chapterSegment = `${encodeURIComponent(chapter.slug)}-ch${chapter.id}`;
        const unitSegment = encodeURIComponent(unit.slug);
        lectureUrl = `${ORIGIN}/course/${courseSlug}/${chapterSegment}/${unitSegment}/`;
      }

      const pageRes = await fetchWithTimeout(lectureUrl, {
        headers: commonHeaders(activeCookie, courseUrl),
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        // Video sources regex
        const sourceRe = /<source\b[^>]*?src=["']([^"'>]+)["'][^>]*>/gim;
        let m: RegExpExecArray | null;
        const videoSources: string[] = [];
        while ((m = sourceRe.exec(html)) !== null) {
          const url = decodeHtmlEntities(m[1]);
          if (url && url.includes('/videos/')) videoSources.push(url);
        }

        const uniqueSources = Array.from(new Set(videoSources));
        qualities = uniqueSources.map((u, i) => {
          const resMatch = u.match(/\/(\d{3,4})p?\//);
          const resNum = resMatch ? parseInt(resMatch[1], 10) : u.includes('hq') ? 720 : 360;
          return {
            resolution: resNum,
            download_url: u,
            label: u.includes('hq') ? 'HQ (720p)' : u.includes('lq') ? 'LQ (360p)' : `${resNum}p`,
          };
        });

        const hq = uniqueSources.find((u) => /\/videos\/hq\d+/.test(u) || u.includes('/videos/hq'));
        bestDownloadUrl = hq || uniqueSources[0] || null;

        // Tracks / subtitles
        const trackRe = /<track\b[^>]*?src=["']([^"'>]+)["'][^>]*>/gim;
        let tm: RegExpExecArray | null;
        while ((tm = trackRe.exec(html)) !== null) {
          const trackUrl = decodeHtmlEntities(tm[1]);
          if (trackUrl && !captionFile) captionFile = trackUrl;
        }

        // Attachments
        const blockRe = /<div[^>]*class=["'][^"'>]*unit-content--download[^"'>]*["'][^>]*>[\s\S]*?<\/div>/gim;
        let bm: RegExpExecArray | null;
        while ((bm = blockRe.exec(html)) !== null) {
          const aRe = /<a[^>]+href=["']([^"'>]+)["'][^>]*>/gim;
          let am: RegExpExecArray | null;
          while ((am = aRe.exec(bm[0])) !== null) {
            const rawAtt = decodeHtmlEntities(am[1]);
            if (rawAtt && /attachments/i.test(rawAtt)) {
              let name = 'attachment.bin';
              try {
                name = new URL(rawAtt).pathname.split('/').pop() || name;
              } catch {}
              attachments.push({ name, download_url: rawAtt });
            }
          }
        }
      }
    }

    res.json({
      unitId,
      qualities,
      bestDownloadUrl,
      captionFile,
      attachments,
      rawVideoData: videoUrlData,
      rawUnitDetails: unitDetails,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching unit details' });
  }
});

// 8. Streaming Proxy Download (handles CORS, range seeking, and sample mode)
app.get('/api/download/proxy', async (req: Request, res: Response) => {
  const { url, filename = 'video.mp4', referer, sampleBytes } = req.query as {
    url?: string;
    filename?: string;
    referer?: string;
    sampleBytes?: string;
  };

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const activeCookie = await getActiveCookie();
    const sampleLimit = sampleBytes ? parseInt(sampleBytes, 10) : 0;
    const clientRange = req.headers.range;

    const requestHeaders: Record<string, string> = {
      ...commonHeaders(activeCookie, referer || ORIGIN),
      accept: '*/*',
    };

    if (sampleLimit > 0) {
      requestHeaders['range'] = `bytes=0-${Math.max(0, sampleLimit - 1)}`;
    } else if (clientRange) {
      requestHeaders['range'] = clientRange;
    }

    const remoteRes = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });

    if (!remoteRes.ok && remoteRes.status !== 206) {
      return res.status(remoteRes.status).send(`Remote server error: ${remoteRes.statusText}`);
    }

    // Forward relevant headers
    res.status(remoteRes.status);
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];
    for (const h of headersToForward) {
      const v = remoteRes.headers.get(h);
      if (v) res.setHeader(h, v);
    }

    const isInline = req.query.inline === 'true';
    const safeFilename = encodeURIComponent(filename);
    res.setHeader(
      'content-disposition',
      `${isInline ? 'inline' : 'attachment'}; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
    );

    if (remoteRes.body) {
      const readable = Readable.fromWeb(remoteRes.body as any);
      if (sampleLimit > 0) {
        let sent = 0;
        const limiter = new Transform({
          transform(chunk, _encoding, callback) {
            if (sent >= sampleLimit) {
              return callback();
            }
            const remaining = sampleLimit - sent;
            const toSend = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
            sent += toSend.length;
            this.push(toSend);
            if (sent >= sampleLimit) {
              this.end();
            }
            callback();
          },
        });
        await pipeline(readable, limiter, res);
      } else {
        await pipeline(readable, res);
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(`Proxy download error: ${err.message}`);
    }
  }
});

// ==========================================
// Background Server Download Task Runner
// ==========================================
interface ActiveTask {
  id: string;
  courseTitle: string;
  courseSlug: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  totalUnits: number;
  completedUnits: number;
  skippedUnits: number;
  failedUnits: number;
  currentUnitTitle: string;
  currentSpeed: string;
  currentPercentage: number;
  currentDownloadedBytes: number;
  currentTotalBytes: number;
  logs: string[];
  outputDir: string;
  controller?: AbortController;
  startTime: number;
  endTime?: number;
}

let activeTask: ActiveTask | null = null;

function formatBytes(bytes?: number | null) {
  if (bytes == null || isNaN(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

class SpeedLimiter extends Transform {
  bytesPerMs: number;
  lastTime: number;
  tokens: number;
  constructor(speedKB: number) {
    super();
    this.bytesPerMs = (speedKB * 1024) / 1000;
    this.lastTime = Date.now();
    this.tokens = this.bytesPerMs * 200;
  }
  _transform(chunk: any, _enc: any, cb: any) {
    if (this.bytesPerMs <= 0) {
      return cb(null, chunk);
    }
    const now = Date.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;
    this.tokens = Math.min(this.tokens + elapsed * this.bytesPerMs, this.bytesPerMs * 1500);

    if (chunk.length <= this.tokens) {
      this.tokens -= chunk.length;
      return cb(null, chunk);
    }

    const waitMs = Math.ceil((chunk.length - this.tokens) / this.bytesPerMs);
    setTimeout(() => {
      this.tokens = 0;
      this.lastTime = Date.now();
      cb(null, chunk);
    }, Math.min(waitMs, 1000));
  }
}

// 9. Start Server Download Task
app.post('/api/download/task/start', async (req: Request, res: Response) => {
  if (activeTask && activeTask.status === 'running') {
    return res.status(409).json({ error: 'A download task is already running', task: activeTask });
  }

  const {
    courseUrl,
    courseSlug,
    selectedUnitIds,
    sampleBytes = 0,
    downloadSubtitles = true,
    downloadAttachments = true,
    qualityPreference = 'highest', // 'highest', '720', '480', 'lowest'
    concurrency = 1,
    speedLimitKB = 0,
    filenameTemplate = 'standard', // 'standard', 'numbered', 'ascii'
    saveMetadata = true,
    saveExercises = true,
  } = req.body;

  if (!courseUrl) {
    return res.status(400).json({ error: 'courseUrl is required' });
  }

  const normalizedUrl = courseUrl.trim().endsWith('/') ? courseUrl.trim() : `${courseUrl.trim()}/`;
  const slug = courseSlug || extractCourseSlug(normalizedUrl);
  const courseDisplayName = sanitizeName(decodeURIComponent(slug));
  const outputRootFolder = path.join(DOWNLOAD_DIR, courseDisplayName);

  await fs.promises.mkdir(outputRootFolder, { recursive: true });

  const controller = new AbortController();
  const taskId = `task_${Date.now()}`;

  activeTask = {
    id: taskId,
    courseTitle: courseDisplayName,
    courseSlug: slug,
    status: 'running',
    totalUnits: 0,
    completedUnits: 0,
    skippedUnits: 0,
    failedUnits: 0,
    currentUnitTitle: 'Initializing...',
    currentSpeed: '0 B/s',
    currentPercentage: 0,
    currentDownloadedBytes: 0,
    currentTotalBytes: 0,
    logs: [`▶️ Started download task for "${courseDisplayName}"`],
    outputDir: outputRootFolder,
    controller,
    startTime: Date.now(),
  };

  // Run in background asynchronously
  (async () => {
    try {
      const activeCookie = await getActiveCookie();
      const courseId = extractCourseIdFromSlug(slug);
      const isLms = /\/lms\/course\//.test(normalizedUrl);

      // Fetch chapters
      let chaptersData: any = null;
      if (courseId) {
        try {
          const r = await fetchWithTimeout(`${ORIGIN}/api/v1/lms/courses/${courseId}/outline/`, {
            headers: commonHeaders(activeCookie, normalizedUrl),
          });
          if (r.ok) chaptersData = await r.json();
        } catch {}
      }
      if (!chaptersData) {
        const safeSlug = encodeURIComponent(decodeURIComponent(slug));
        const r = await fetchWithTimeout(`${ORIGIN}/api/v1/courses/${safeSlug}/chapters/`, {
          headers: commonHeaders(activeCookie, normalizedUrl),
        });
        if (r.ok) chaptersData = await r.json();
      }

      const chapters: any[] = chaptersData?.chapters || [];
      if (chapters.length === 0) {
        throw new Error('No chapters found to download.');
      }

      // Collect target video units
      interface TargetUnit {
        chapterTitle: string;
        chapterOrder: string;
        unit: any;
        unitOrder: string;
      }
      const targets: TargetUnit[] = [];

      for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
        const ch = chapters[cIdx];
        const chapterOrder = String(cIdx + 1).padStart(2, '0');
        const units: any[] = Array.isArray(ch.units) ? ch.units : Array.isArray(ch.unit_set) ? ch.unit_set : [];
        for (let uIdx = 0; uIdx < units.length; uIdx++) {
          const u = units[uIdx];
          const isVideo = typeof u.type === 'number' ? u.type === 1 : u.type === 'lecture';
          if (!isVideo) continue;

          const uId = String(u.id || u.unit_id || `${cIdx + 1}-${uIdx + 1}`);
          if (Array.isArray(selectedUnitIds) && selectedUnitIds.length > 0) {
            if (!selectedUnitIds.map(String).includes(uId)) continue;
          }

          targets.push({
            chapterTitle: sanitizeName(ch.title || ch.slug || 'Chapter'),
            chapterOrder,
            unit: u,
            unitOrder: String(uIdx + 1).padStart(2, '0'),
          });
        }
      }

      if (!activeTask) return;
      activeTask.totalUnits = targets.length;
      activeTask.logs.push(`📋 Identified ${targets.length} video lectures to process.`);

      // 1. Auto-save Course README.txt & Syllabus if saveMetadata is enabled
      if (saveMetadata !== false) {
        try {
          const readmeLines = [
            `=============================================================`,
            ` دوره آموزشی: ${courseDisplayName}`,
            ` آدرس در مکتب‌خونه: ${normalizedUrl}`,
            ` تاریخ دانلود: ${new Date().toLocaleDateString('fa-IR')} (${new Date().toISOString()})`,
            ` تعداد کل فصل‌ها: ${chapters.length}`,
            ` کیفیت انتخابی: ${qualityPreference}`,
            `=============================================================`,
            ``,
            `فهرست سرفصل‌ها و جلسات:`,
          ];
          chapters.forEach((ch: any, cI: number) => {
            readmeLines.push(`\n[فصل ${String(cI + 1).padStart(2, '0')}] ${ch.title || ch.slug}`);
            const uList = Array.isArray(ch.units) ? ch.units : Array.isArray(ch.unit_set) ? ch.unit_set : [];
            uList.forEach((u: any, uI: number) => {
              const isVid = typeof u.type === 'number' ? u.type === 1 : u.type === 'lecture';
              const typeStr = isVid ? '🎬 ویدیو' : '📝 تمرین/متن';
              readmeLines.push(`  ${String(uI + 1).padStart(2, '0')}. ${u.title || u.slug} (${typeStr}${u.duration ? ' - ' + u.duration : ''})`);
            });
          });
          await fs.promises.writeFile(path.join(outputRootFolder, 'README.txt'), readmeLines.join('\n'), 'utf8');
          await fs.promises.writeFile(path.join(outputRootFolder, 'info.json'), JSON.stringify(chaptersData, null, 2), 'utf8');
          activeTask.logs.push(`📄 Generated course README.txt & info.json syllabus.`);
        } catch {}
      }

      // 2. Auto-save Quizzes & Exercises if saveExercises is enabled
      if (saveExercises !== false) {
        try {
          const nonVideoUnits: Array<{ chTitle: string; unit: any }> = [];
          chapters.forEach((ch: any) => {
            const uList = Array.isArray(ch.units) ? ch.units : Array.isArray(ch.unit_set) ? ch.unit_set : [];
            uList.forEach((u: any) => {
              const isVid = typeof u.type === 'number' ? u.type === 1 : u.type === 'lecture';
              if (!isVid) nonVideoUnits.push({ chTitle: ch.title || ch.slug, unit: u });
            });
          });

          if (nonVideoUnits.length > 0) {
            const exHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تمرینات و آزمون‌های دوره ${courseDisplayName}</title>
  <style>
    body { font-family: Tahoma, sans-serif; background: #f8fafc; color: #0f172a; padding: 2rem; line-height: 1.8; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    h1 { color: #059669; }
    .chapter { font-size: 1.1rem; font-weight: bold; color: #0f766e; }
    .title { font-weight: bold; margin-top: 0.5rem; }
    .desc { margin-top: 0.5rem; color: #334155; }
  </style>
</head>
<body>
  <h1>تمرینات، پروژه‌ها و آزمون‌های دوره: ${courseDisplayName}</h1>
  <p>آدرس دوره: <a href="${normalizedUrl}">${normalizedUrl}</a></p>
  <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #cbd5e1;">
  ${nonVideoUnits.map((item, idx) => `
    <div class="card">
      <div class="chapter">${item.chTitle}</div>
      <div class="title">#${idx + 1} - ${item.unit.title || item.unit.slug}</div>
      <div class="desc">${item.unit.description || 'توضیحات تمرین در سامانه مکتب‌خونه.'}</div>
    </div>
  `).join('')}
</body>
</html>`;
            await fs.promises.writeFile(path.join(outputRootFolder, 'تمرینات و آزمون‌ها.html'), exHtml, 'utf8');
            activeTask.logs.push(`📝 Saved ${nonVideoUnits.length} course quizzes & exercises into HTML.`);
          }
        } catch {}
      }

      // Unit Processing Function
      async function processSingleUnit(item: TargetUnit, index: number) {
        if (controller.signal.aborted) return;
        const u = item.unit;
        const unitTitle = sanitizeName(u.title || u.slug || 'Lecture');
        const chapterFolder = path.join(outputRootFolder, `${item.chapterOrder} - ${item.chapterTitle}`);
        await fs.promises.mkdir(chapterFolder, { recursive: true });

        activeTask!.currentUnitTitle = `[${index + 1}/${targets.length}] ${unitTitle}`;
        activeTask!.logs.push(`🎬 [${index + 1}/${targets.length}] Processing: ${unitTitle}`);

        if (u.locked === true) {
          activeTask!.skippedUnits++;
          activeTask!.logs.push(`🔒 Skipped locked unit: ${unitTitle}`);
          return;
        }

        const unitId = u.id || u.unit_id;
        let downloadUrl: string | null = null;
        let captionFile: string | null = null;
        let attachments: string[] = [];

        // Fetch unit details & URL
        try {
          if (unitId) {
            const [vRes, dRes] = await Promise.all([
              fetchWithTimeout(`${ORIGIN}/api/v1/lms/units/${unitId}/video_url/`, {
                headers: commonHeaders(activeCookie, normalizedUrl),
              }).catch(() => null),
              fetchWithTimeout(`${ORIGIN}/api/v1/lms/units/${unitId}/`, {
                headers: commonHeaders(activeCookie, normalizedUrl),
              }).catch(() => null),
            ]);

            if (vRes && vRes.ok) {
              const vData = await vRes.json();
              if (Array.isArray(vData?.qualities) && vData.qualities.length > 0) {
                const sorted = [...vData.qualities].sort((a, b) => (b.resolution || 0) - (a.resolution || 0));
                if (qualityPreference === 'lowest') {
                  downloadUrl = sorted[sorted.length - 1]?.download_url || sorted[0]?.download_url;
                } else if (qualityPreference === '480') {
                  const q480 = sorted.find((q) => q.resolution <= 480);
                  downloadUrl = q480?.download_url || sorted[0]?.download_url;
                } else if (qualityPreference === '720') {
                  const q720 = sorted.find((q) => q.resolution <= 720);
                  downloadUrl = q720?.download_url || sorted[0]?.download_url;
                } else {
                  downloadUrl = sorted[0]?.download_url;
                }
              }
              if (!downloadUrl && vData?.video_urls) {
                downloadUrl = vData.video_urls.hq || vData.video_urls.lq || null;
              }
            }

            if (dRes && dRes.ok) {
              const dData = await dRes.json();
              if (dData?.has_caption && dData?.caption_file) {
                captionFile = dData.caption_file;
              }
              if (Array.isArray(dData?.resources)) {
                attachments = dData.resources
                  .filter((r: any) => r && r.type !== 1 && r.download_url)
                  .map((r: any) => r.download_url);
              }
            }
          }
        } catch (e: any) {
          activeTask!.logs.push(`⚠️ Error fetching metadata for unit ${unitTitle}: ${e.message}`);
        }

        if (!downloadUrl) {
          activeTask!.skippedUnits++;
          activeTask!.logs.push(`⚠️ No video source URL found for: ${unitTitle}`);
          return;
        }

        const isSample = sampleBytes > 0;
        let fileName = `${item.unitOrder} - ${unitTitle}${isSample ? '.sample.mp4' : '.mp4'}`;
        if (filenameTemplate === 'numbered') {
          fileName = `${item.chapterOrder}.${item.unitOrder} - ${unitTitle} [${qualityPreference}]${isSample ? '.sample.mp4' : '.mp4'}`;
        } else if (filenameTemplate === 'ascii') {
          const safeSlug = sanitizeName(u.slug || `unit-${item.unitOrder}`);
          fileName = `Ch${item.chapterOrder}-U${item.unitOrder}-${safeSlug}${isSample ? '.sample.mp4' : '.mp4'}`;
        }
        const filePath = path.join(chapterFolder, fileName);

        // Check if file already exists
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0 && !isSample) {
          activeTask!.skippedUnits++;
          activeTask!.logs.push(`🟡 File already exists: ${fileName}`);
        } else {
          // Download video file
          try {
            const dlRes = await fetch(downloadUrl, {
              headers: {
                ...commonHeaders(activeCookie, normalizedUrl),
                accept: 'video/mp4,*/*',
                ...(isSample ? { range: `bytes=0-${sampleBytes - 1}` } : {}),
              },
              signal: controller.signal,
            });

            if (!dlRes.ok && dlRes.status !== 206) {
              throw new Error(`HTTP ${dlRes.status} ${dlRes.statusText}`);
            }

            const contentLength = dlRes.headers.get('content-length');
            const totalBytes = isSample
              ? sampleBytes
              : contentLength
                ? parseInt(contentLength, 10)
                : 0;

            activeTask!.currentTotalBytes = totalBytes;
            activeTask!.currentDownloadedBytes = 0;
            let downloadedBytes = 0;
            const startTime = Date.now();

            const fileStream = fs.createWriteStream(filePath);
            const readable = Readable.fromWeb(dlRes.body as any);

            const counter = new Transform({
              transform(chunk, _enc, cb) {
                downloadedBytes += chunk.length;
                if (activeTask) {
                  activeTask.currentDownloadedBytes = downloadedBytes;
                  const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
                  const speed = downloadedBytes / elapsedSec;
                  activeTask.currentSpeed = `${formatBytes(speed)}/s`;
                  if (totalBytes > 0) {
                    activeTask.currentPercentage = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                  }
                }
                cb(null, chunk);
              },
            });

            const streamPipeline: any[] = [readable, counter];
            if (speedLimitKB && speedLimitKB > 0) {
              streamPipeline.push(new SpeedLimiter(speedLimitKB));
            }

            if (isSample) {
              let hit = 0;
              const limiter = new Transform({
                transform(chunk, _enc, cb) {
                  if (hit >= sampleBytes) return cb();
                  const rem = sampleBytes - hit;
                  const b = chunk.length > rem ? chunk.subarray(0, rem) : chunk;
                  hit += b.length;
                  this.push(b);
                  if (hit >= sampleBytes) this.end();
                  cb();
                },
              });
              streamPipeline.push(limiter);
            }
            streamPipeline.push(fileStream);

            await (pipeline as any)(...streamPipeline);

            activeTask!.completedUnits++;
            activeTask!.logs.push(`✅ Downloaded: ${fileName} (${formatBytes(downloadedBytes)})`);
          } catch (dlErr: any) {
            if (controller.signal.aborted) return;
            activeTask!.failedUnits++;
            activeTask!.logs.push(`❌ Failed downloading ${fileName}: ${dlErr.message}`);
          }
        }

        // Subtitles
        if (downloadSubtitles && captionFile && !controller.signal.aborted) {
          try {
            const subName = fileName.replace(/\.sample\.mp4$/i, '').replace(/\.mp4$/i, '') + '.vtt';
            const subPath = path.join(chapterFolder, subName);
            if (!fs.existsSync(subPath)) {
              let absSubUrl = captionFile;
              try {
                const uObj = new URL(captionFile, ORIGIN);
                if (!uObj.searchParams.get('file')) {
                  uObj.searchParams.set('file', subName);
                }
                absSubUrl = uObj.toString();
              } catch {}

              const subRes = await fetch(absSubUrl, {
                headers: commonHeaders(activeCookie, normalizedUrl),
              });
              if (subRes.ok && subRes.body) {
                await pipeline(Readable.fromWeb(subRes.body as any), fs.createWriteStream(subPath));
                activeTask!.logs.push(`📝 Subtitle saved: ${subName}`);
              }
            }
          } catch (sErr: any) {
            activeTask!.logs.push(`⚠️ Subtitle download skipped: ${sErr.message}`);
          }
        }

        // Attachments
        if (downloadAttachments && attachments.length > 0 && !controller.signal.aborted) {
          for (const attUrl of attachments) {
            try {
              let attFileName = 'attachment.bin';
              try {
                attFileName = new URL(attUrl).pathname.split('/').pop() || attFileName;
              } catch {}
              const baseNoExt = fileName.replace(/\.sample\.mp4$/i, '').replace(/\.mp4$/i, '');
              const finalAttName = `${baseNoExt} - ${sanitizeName(attFileName)}`;
              const attPath = path.join(chapterFolder, finalAttName);
              if (!fs.existsSync(attPath)) {
                const attRes = await fetch(attUrl, {
                  headers: commonHeaders(activeCookie, normalizedUrl),
                });
                if (attRes.ok && attRes.body) {
                  await pipeline(Readable.fromWeb(attRes.body as any), fs.createWriteStream(attPath));
                  activeTask!.logs.push(`📎 Attachment saved: ${finalAttName}`);
                }
              }
            } catch (aErr: any) {
              activeTask!.logs.push(`⚠️ Attachment download skipped: ${aErr.message}`);
            }
          }
        }
      }

      // Parallel download worker pool
      const numWorkers = Math.min(Math.max(1, concurrency || 1), 3);
      if (numWorkers > 1) {
        activeTask.logs.push(`⚡ Running with ${numWorkers} parallel download workers.`);
      }

      let currentTargetIdx = 0;
      async function runWorker() {
        while (currentTargetIdx < targets.length && !controller.signal.aborted) {
          const idx = currentTargetIdx++;
          await processSingleUnit(targets[idx], idx);
        }
      }

      await Promise.all(Array.from({ length: numWorkers }, () => runWorker()));

      if (activeTask && activeTask.status === 'running') {
        activeTask.status = 'completed';
        activeTask.currentUnitTitle = 'Complete';
        activeTask.currentPercentage = 100;
        activeTask.endTime = Date.now();
        activeTask.logs.push(
          `🎉 Done! Downloaded: ${activeTask.completedUnits}, Skipped: ${activeTask.skippedUnits}, Failed: ${activeTask.failedUnits}`
        );
      }
    } catch (err: any) {
      if (activeTask) {
        activeTask.status = 'error';
        activeTask.logs.push(`❌ Task failed: ${err.message}`);
      }
    }
  })();

  res.json({ success: true, taskId, task: activeTask });
});

// 10. Check Task Status
app.get('/api/download/task/status', (_req: Request, res: Response) => {
  if (!activeTask) {
    return res.json({ status: 'idle' });
  }
  const { controller, ...rest } = activeTask;
  res.json(rest);
});

// 11. Cancel Task
app.post('/api/download/task/cancel', (_req: Request, res: Response) => {
  if (activeTask && activeTask.status === 'running') {
    activeTask.controller?.abort();
    activeTask.status = 'cancelled';
    activeTask.logs.push('⏹️ Cancelled by user.');
    return res.json({ success: true, message: 'Task cancelled' });
  }
  res.json({ success: false, message: 'No running task to cancel' });
});

// 12. Browse Downloaded Files on Server
app.get('/api/download/files', async (_req: Request, res: Response) => {
  try {
    interface FileItem {
      name: string;
      relativePath: string;
      size: number;
      isDirectory: boolean;
      modifiedAt: Date;
    }

    async function scanDir(currentDir: string, rel: string = ''): Promise<FileItem[]> {
      const items: FileItem[] = [];
      if (!fs.existsSync(currentDir)) return items;
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        const relPath = path.join(rel, entry.name);
        if (entry.isDirectory()) {
          const stats = await fs.promises.stat(full);
          items.push({
            name: entry.name,
            relativePath: relPath,
            size: 0,
            isDirectory: true,
            modifiedAt: stats.mtime,
          });
          const subs = await scanDir(full, relPath);
          items.push(...subs);
        } else {
          const stats = await fs.promises.stat(full);
          items.push({
            name: entry.name,
            relativePath: relPath,
            size: stats.size,
            isDirectory: false,
            modifiedAt: stats.mtime,
          });
        }
      }
      return items;
    }

    const files = await scanDir(DOWNLOAD_DIR);
    res.json({ baseDir: DOWNLOAD_DIR, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Serve or Download Server-Saved File
app.get('/api/download/file', (req: Request, res: Response) => {
  const relPath = req.query.path as string;
  if (!relPath) return res.status(400).send('path is required');

  const fullPath = path.resolve(DOWNLOAD_DIR, relPath);
  if (!fullPath.startsWith(DOWNLOAD_DIR)) {
    return res.status(403).send('Forbidden path');
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return res.status(400).send('Path is a directory');
  }

  const filename = path.basename(fullPath);
  res.download(fullPath, filename);
});

// 14. Zip and Download Course Folder
app.get('/api/download/zip', (req: Request, res: Response) => {
  const folder = req.query.folder as string;
  if (!folder) return res.status(400).send('folder is required');

  const fullPath = path.resolve(DOWNLOAD_DIR, folder);
  if (!fullPath.startsWith(DOWNLOAD_DIR) || !fs.existsSync(fullPath)) {
    return res.status(404).send('Folder not found');
  }

  const zipName = `${sanitizeName(folder)}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipName)}"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);
  archive.directory(fullPath, folder);
  archive.finalize();
});

// ==========================================
// VTT to SRT Subtitle Converter
// ==========================================
function convertVttToSrt(vttText: string): string {
  const lines = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let srt = '';
  let cueIndex = 1;
  let inCue = false;
  let timestampLine = '';
  let cuePayload: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (
      line.startsWith('WEBVTT') ||
      line.startsWith('Kind:') ||
      line.startsWith('Language:') ||
      line.startsWith('NOTE')
    ) {
      continue;
    }

    if (line.includes('-->')) {
      if (inCue && timestampLine && cuePayload.length > 0) {
        srt += `${cueIndex}\n${timestampLine}\n${cuePayload.join('\n')}\n\n`;
        cueIndex++;
        cuePayload = [];
      }
      inCue = true;
      // Convert MM:SS.mmm to 00:MM:SS,mmm or HH:MM:SS.mmm to HH:MM:SS,mmm
      const formatted = line.replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2')
        .replace(/(\b\d{2}:\d{2})\.(\d{3})/g, '00:$1,$2');
      timestampLine = formatted;
    } else if (inCue) {
      if (line === '') {
        if (timestampLine && cuePayload.length > 0) {
          srt += `${cueIndex}\n${timestampLine}\n${cuePayload.join('\n')}\n\n`;
          cueIndex++;
        }
        inCue = false;
        timestampLine = '';
        cuePayload = [];
      } else {
        // Remove style tags
        const clean = line.replace(/<\/?[^>]+(>|$)/g, '');
        cuePayload.push(clean);
      }
    }
  }

  if (inCue && timestampLine && cuePayload.length > 0) {
    srt += `${cueIndex}\n${timestampLine}\n${cuePayload.join('\n')}\n\n`;
  }

  return srt;
}

app.get('/api/media/vtt-to-srt', async (req: Request, res: Response) => {
  const { url, filename = 'subtitles.srt' } = req.query as { url?: string; filename?: string };
  if (!url) return res.status(400).send('url is required');

  try {
    const activeCookie = await getActiveCookie();
    const subRes = await fetchWithTimeout(url, {
      headers: commonHeaders(activeCookie, ORIGIN),
    });

    if (!subRes.ok) {
      return res.status(subRes.status).send('Failed to fetch subtitle');
    }

    const vttText = await subRes.text();
    const srtText = convertVttToSrt(vttText);

    const safeName = encodeURIComponent(filename.endsWith('.srt') ? filename : `${filename}.srt`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`);
    res.send(srtText);
  } catch (err: any) {
    res.status(500).send(`Subtitle conversion error: ${err.message}`);
  }
});

// ==========================================
// User Enrolled Courses (My Courses)
// ==========================================
app.get('/api/user/my-courses', async (_req: Request, res: Response) => {
  try {
    const activeCookie = await getActiveCookie();
    const courses: Array<{ id?: number | string; title: string; slug: string; url: string; banner?: string }> = [];

    if (activeCookie) {
      // Try official user courses JSON endpoint
      try {
        const r1 = await fetchWithTimeout(`${ORIGIN}/api/v1/user/courses/`, {
          headers: commonHeaders(activeCookie, ORIGIN),
        });
        if (r1.ok) {
          const j1 = await r1.json();
          const items = Array.isArray(j1?.results) ? j1.results : Array.isArray(j1) ? j1 : [];
          for (const item of items) {
            const slug = item.slug || (item.url ? extractCourseSlug(item.url) : '');
            if (slug) {
              courses.push({
                id: item.id,
                title: item.title || item.name || slug,
                slug,
                url: `${ORIGIN}/course/${slug}/`,
                banner: item.image || item.banner || null,
              });
            }
          }
        }
      } catch {}

      // If empty, try scraping my-courses HTML page
      if (courses.length === 0) {
        try {
          const r2 = await fetchWithTimeout(`${ORIGIN}/my-courses/`, {
            headers: commonHeaders(activeCookie, ORIGIN),
          });
          if (r2.ok) {
            const html = await r2.text();
            const linkRe = /<a[^>]+href=["'](\/(?:lms\/)?course\/([^"'\/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match: RegExpExecArray | null;
            const seenSlugs = new Set<string>();

            while ((match = linkRe.exec(html)) !== null) {
              const relUrl = match[1];
              const slug = match[2];
              if (slug && !seenSlugs.has(slug)) {
                seenSlugs.add(slug);
                // Extract title inside tag
                const inner = match[3];
                const titleMatch = inner.match(/class=["'][^"']*title[^"']*["'][^>]*>([^<]+)</i);
                const title = titleMatch ? titleMatch[1].trim() : decodeURIComponent(slug);
                courses.push({
                  title: sanitizeName(title),
                  slug,
                  url: `${ORIGIN}${relUrl.endsWith('/') ? relUrl : relUrl + '/'}`,
                });
              }
            }
          }
        } catch {}
      }
    }

    // Curated popular Maktabkhooneh courses as helpful starter recommendations
    const featured = [
      {
        id: 10645,
        title: 'آموزش پایتون پیشرفته (Advanced Python)',
        slug: 'آموزش-پایتون-پیشرفته-mk10645',
        url: 'https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-%D9%BE%DB%8C%D8%B4%D8%B1%D9%81%D8%AA%D9%87-mk10645/',
      },
      {
        id: 4520,
        title: 'یادگیری ماشین (Machine Learning)',
        slug: 'یادگیری-ماشین-mk4520',
        url: 'https://maktabkhooneh.org/course/%DB%8C%D8%A7%D8%AF%DA%AF%DB%8C%D8%B1%DB%8C-%D9%85%D8%A7%D8%B4%DB%8C%D9%86-mk4520/',
      },
      {
        id: 3120,
        title: 'آموزش جامع جنگو (Django Framework)',
        slug: 'آموزش-جنگو-mk3120',
        url: 'https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%AC%D9%86%DA%AF%D9%88-mk3120/',
      },
      {
        id: 8840,
        title: 'علم داده و تحلیل داده با پایتون (Data Science)',
        slug: 'علم-داده-پایتون-mk8840',
        url: 'https://maktabkhooneh.org/course/%D8%B9%D9%84%D9%85-%D8%AF%D8%A7%D8%AF%D9%87-%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-mk8840/',
      },
    ];

    res.json({
      isAuthenticated: !!activeCookie,
      myCourses: courses,
      featured,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Export Downloader Formats (IDM, Aria2, cURL, Wget, M3U8)
// ==========================================
app.post('/api/export/generate', async (req: Request, res: Response) => {
  const {
    format = 'idm_txt',
    courseTitle = 'Course',
    courseUrl = ORIGIN,
    units = [],
  } = req.body as {
    format: 'idm_txt' | 'idm_ef2' | 'aria2' | 'curl_sh' | 'wget_sh' | 'm3u8';
    courseTitle: string;
    courseUrl: string;
    units: Array<{
      order: number;
      title: string;
      downloadUrl: string;
      filename?: string;
    }>;
  };

  if (!Array.isArray(units) || units.length === 0) {
    return res.status(400).json({ error: 'units list is required' });
  }

  const activeCookie = await getActiveCookie();
  const safeCourseName = sanitizeName(courseTitle);
  let content = '';
  let outputFilename = `${safeCourseName}`;
  let mimeType = 'text/plain; charset=utf-8';

  if (format === 'idm_txt') {
    // IDM Plain Text URLs list
    content = units.map((u) => u.downloadUrl).join('\r\n');
    outputFilename += '-idm-links.txt';
  } else if (format === 'idm_ef2') {
    // IDM Export File format (.ef2) with full headers and filenames
    outputFilename += '-idm.ef2';
    const lines: string[] = [];
    units.forEach((u) => {
      const fn = u.filename || `${String(u.order).padStart(2, '0')} - ${sanitizeName(u.title)}.mp4`;
      lines.push('<');
      lines.push(u.downloadUrl);
      lines.push(`file: ${fn}`);
      lines.push(`referer: ${courseUrl}`);
      if (activeCookie) lines.push(`cookie: ${activeCookie}`);
      lines.push('>');
    });
    content = lines.join('\r\n');
  } else if (format === 'aria2') {
    // Aria2 Batch File format
    outputFilename += '-aria2.txt';
    const lines: string[] = [];
    units.forEach((u) => {
      const fn = u.filename || `${String(u.order).padStart(2, '0')} - ${sanitizeName(u.title)}.mp4`;
      lines.push(u.downloadUrl);
      lines.push(`  out=${safeCourseName}/${fn}`);
      lines.push(`  header=Referer: ${courseUrl}`);
      if (activeCookie) lines.push(`  header=Cookie: ${activeCookie}`);
      lines.push('  header=User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125');
    });
    content = lines.join('\n');
  } else if (format === 'curl_sh') {
    // Bash cURL script
    outputFilename += '-download-curl.sh';
    const lines: string[] = [
      '#!/usr/bin/env bash',
      `# Maktabkhooneh Batch Download Script (cURL)`,
      `# Course: ${safeCourseName}`,
      `OUTPUT_DIR="download/${safeCourseName}"`,
      'mkdir -p "$OUTPUT_DIR"',
      '',
    ];
    units.forEach((u) => {
      const fn = u.filename || `${String(u.order).padStart(2, '0')} - ${sanitizeName(u.title)}.mp4`;
      const cookiePart = activeCookie ? `-H "Cookie: ${activeCookie}" ` : '';
      lines.push(`echo "⬇️ Downloading ${fn}..."`);
      lines.push(`curl -L -C - ${cookiePart}-H "Referer: ${courseUrl}" -H "User-Agent: Mozilla/5.0" "${u.downloadUrl}" -o "$OUTPUT_DIR/${fn}"`);
      lines.push('');
    });
    content = lines.join('\n');
  } else if (format === 'wget_sh') {
    // Bash Wget script
    outputFilename += '-download-wget.sh';
    const lines: string[] = [
      '#!/usr/bin/env bash',
      `# Maktabkhooneh Batch Download Script (wget)`,
      `# Course: ${safeCourseName}`,
      `OUTPUT_DIR="download/${safeCourseName}"`,
      'mkdir -p "$OUTPUT_DIR"',
      '',
    ];
    units.forEach((u) => {
      const fn = u.filename || `${String(u.order).padStart(2, '0')} - ${sanitizeName(u.title)}.mp4`;
      const headerPart = activeCookie ? `--header="Cookie: ${activeCookie}" ` : '';
      lines.push(`echo "⬇️ Downloading ${fn}..."`);
      lines.push(`wget -c ${headerPart}--header="Referer: ${courseUrl}" "${u.downloadUrl}" -O "$OUTPUT_DIR/${fn}"`);
      lines.push('');
    });
    content = lines.join('\n');
  } else if (format === 'm3u8') {
    // M3U Playlist file for VLC / PotPlayer
    outputFilename += '.m3u8';
    mimeType = 'application/vnd.apple.mpegurl; charset=utf-8';
    const lines: string[] = ['#EXTM3U'];
    units.forEach((u) => {
      const cleanTitle = sanitizeName(u.title);
      lines.push(`#EXTINF:-1,${String(u.order).padStart(2, '0')} - ${cleanTitle}`);
      lines.push(u.downloadUrl);
    });
    content = lines.join('\n');
  }

  const encodedName = encodeURIComponent(outputFilename);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
  res.send(content);
});

// ==========================================
// Vite Integration (Dev) or Static Serving (Prod)
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built dist folder
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Maktabkhooneh Downloader server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
