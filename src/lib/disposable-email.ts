/**
 * Disposable email validation utility
 * Uses NPM package (static list) + Supabase RPC (dynamic list) for comprehensive coverage
 */
import disposableDomains from 'disposable-email-domains';
import { supabase } from '@/integrations/supabase/client';

// Convert to Set for O(1) lookups
const disposableDomainsSet = new Set<string>(disposableDomains as string[]);

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  return email.toLowerCase().split('@')[1] || '';
}

/**
 * Check if email is from a disposable/temporary provider
 * Uses local list first (instant), then falls back to DB for custom domains
 */
export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = extractDomain(email);
  if (!domain) return false;

  // 1. Check local NPM package list (~3000+ domains, instant)
  if (disposableDomainsSet.has(domain)) {
    return true;
  }

  // 2. Check database for custom/manually added domains (async)
  try {
    const { data, error } = await supabase.rpc('is_disposable_email', {
      check_email: email,
    });
    if (!error && data === true) {
      return true;
    }
  } catch (err) {
    console.warn('[DisposableEmail] DB check failed, relying on local list only:', err);
  }

  return false;
}
