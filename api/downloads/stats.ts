import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdmin } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await verifyAdmin(req, res);
  if (!session) return;

  const supabase = getAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Fetch all clicks from last 90 days for charts
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();

  const [totalAll, totalIos, totalAndroid, todayAll, week, month, recentClicks] = await Promise.allSettled([
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }),
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }).eq('platform', 'ios'),
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }).eq('platform', 'android'),
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('download_clicks').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('download_clicks')
      .select('platform, referrer, utm_source, utm_campaign, country, city, latitude, longitude, created_at')
      .gte('created_at', ninetyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5000),
  ]);

  const clicks = recentClicks.status === 'fulfilled' ? (recentClicks.value.data ?? []) : [];

  // Daily counts for chart (last 30 days)
  const dailyCounts: Record<string, { ios: number; android: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyCounts[key] = { ios: 0, android: 0 };
  }
  for (const c of clicks) {
    const day = c.created_at.slice(0, 10);
    if (dailyCounts[day]) {
      if (c.platform === 'ios') dailyCounts[day].ios++;
      else if (c.platform === 'android') dailyCounts[day].android++;
    }
  }

  // Top countries
  const countryCounts: Record<string, number> = {};
  for (const c of clicks) {
    if (c.country) countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
  }
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([country, count]) => ({ country, count }));

  // Top cities
  const cityCounts: Record<string, { count: number; country: string }> = {};
  for (const c of clicks) {
    if (c.city && c.country) {
      const key = `${c.city}, ${c.country}`;
      if (!cityCounts[key]) cityCounts[key] = { count: 0, country: c.country };
      cityCounts[key].count++;
    }
  }
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([city, data]) => ({ city, count: data.count }));

  // Top referrers
  const refCounts: Record<string, number> = {};
  for (const c of clicks) {
    const ref = c.referrer || c.utm_source || 'Direct';
    refCounts[ref] = (refCounts[ref] || 0) + 1;
  }
  const topReferrers = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([source, count]) => ({ source, count }));

  // Top campaigns
  const campaignCounts: Record<string, number> = {};
  for (const c of clicks) {
    if (c.utm_campaign) campaignCounts[c.utm_campaign] = (campaignCounts[c.utm_campaign] || 0) + 1;
  }
  const topCampaigns = Object.entries(campaignCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([campaign, count]) => ({ campaign, count }));

  // Location pins (deduplicated by city)
  const locationPins: { lat: number; lng: number; city: string; country: string; count: number }[] = [];
  const pinMap: Record<string, { lat: number; lng: number; city: string; country: string; count: number }> = {};
  for (const c of clicks) {
    if (c.latitude && c.longitude && c.city) {
      const key = `${c.city}-${c.country}`;
      if (!pinMap[key]) {
        pinMap[key] = { lat: c.latitude, lng: c.longitude, city: c.city, country: c.country || '', count: 0 };
      }
      pinMap[key].count++;
    }
  }
  locationPins.push(...Object.values(pinMap).sort((a, b) => b.count - a.count).slice(0, 50));

  const count = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.count : null;

  return res.status(200).json({
    total: count(totalAll),
    ios: count(totalIos),
    android: count(totalAndroid),
    today: count(todayAll),
    week: count(week),
    month: count(month),
    daily: Object.entries(dailyCounts).map(([date, counts]) => ({ date, ...counts })),
    topCountries,
    topCities,
    topReferrers,
    topCampaigns,
    locationPins,
  });
}
