import { supabase } from './supabase';

export interface AnalyticsVisit {
  id: string;
  page_key: string;
  page_title: string;
  training_id: string | null;
  visitor_id: string | null;
  referrer: string | null;
  created_at: string;
  training?: {
    title: string;
    slug: string;
  } | null;
}

const VISITOR_STORAGE_KEY = 'vysper_visitor_id';

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;

  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  return visitorId;
}

export async function trackWebsiteVisit(input: {
  pageKey: string;
  pageTitle: string;
  trainingId?: string | null;
}) {
  const { error } = await supabase.from('website_visits').insert({
    page_key: input.pageKey,
    page_title: input.pageTitle,
    training_id: input.trainingId ?? null,
    visitor_id: getVisitorId(),
    referrer: document.referrer || null,
    user_agent: navigator.userAgent
  });

  if (error) {
    console.warn('Unable to track website visit.', error.message);
  }
}

export async function fetchWebsiteVisits(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('website_visits')
    .select('id, page_key, page_title, training_id, visitor_id, referrer, created_at, training:trainings(title, slug)')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as AnalyticsVisit[];
}
