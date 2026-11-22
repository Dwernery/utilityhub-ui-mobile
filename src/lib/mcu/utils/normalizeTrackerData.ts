import type {
  ApiDomain,
  ApiMovie,
  ApiShow,
  ExpandedCategory,
  McuItem,
  McuTrackerResponse,
  MovieItem,
  Phase,
  TvItem,
} from '../types';
import { compareIsoDates } from '@/lib/dates';

import { assignCategoryColors } from './categoryColors';

// The API doesn't send colors. Phases show their saga's color; categories get one each (categoryColors.ts).

/** Pre-normalization item: premiereDate is still the raw API date string. */
type RawItem<T extends McuItem> = Omit<T, 'premiereDate'> & { premiereDate?: string };

/** Each show record is one season. */
function normalizeShow(source: ApiShow): RawItem<TvItem> {
  return {
    id: `${source.globalId}-season${source.seasonNumber}`,
    recordId: source.id,
    globalId: source.globalId,
    type: 'tv',
    title: source.title,
    seasonNumber: source.seasonNumber,
    premiereDate: source.premiereDate,
    synopsis: source.synopsis,
    s3Url: source.s3Url,
    episodes: (source.episodes ?? []).map((episode) => ({
      id: episode.id,
      title: episode.title,
      globalId: episode.globalId,
      episodeNumber: episode.episodeNumber,
      runtime: episode.runtime,
    })),
  };
}

function normalizeMovie(source: ApiMovie): RawItem<MovieItem> {
  return {
    id: source.globalId,
    recordId: source.id,
    globalId: source.globalId,
    type: source.type === 'SPECIAL' ? 'special' : 'movie',
    title: source.title,
    premiereDate: source.premiereDate,
    runtime: source.runtime,
    synopsis: source.synopsis,
    s3Url: source.s3Url,
  };
}


function extractDomainItems(domain: ApiDomain | undefined): McuItem[] {
  const items: RawItem<McuItem>[] = [
    ...(domain?.movies ?? []).map(normalizeMovie),
    ...(domain?.shows ?? []).map(normalizeShow),
  ];

  // Undated items go last, like the API's own order.
  items.sort((a, b) => compareIsoDates(a.premiereDate || '9999', b.premiereDate || '9999'));

  return items.map(
    // premiereDate is a calendar date ("YYYY-MM-DD"); read the year from the string so the
    // device's time zone can't shift it (new Date() would).
    (item) => ({ ...item, premiereDate: item.premiereDate ? Number(item.premiereDate.slice(0, 4)) : NaN }) as McuItem,
  );
}

export function normalizeTrackerData(apiData: McuTrackerResponse | null | undefined): {
  phases: Phase[];
  expandedCategories: ExpandedCategory[];
} {
  const domains = apiData?.domains ?? [];

  // Group domains by phase number ("Phase 1" → 1); everything else is "Expanded Universe"
  const phaseMap: Record<number, Phase> = {};
  const expandedDomains: ApiDomain[] = [];

  for (const domain of domains) {
    const phaseMatch = domain.domainName?.match(/Phase\s+(\d+)/i);
    const phaseNumber = phaseMatch ? parseInt(phaseMatch[1], 10) : null;

    if (phaseNumber) {
      phaseMap[phaseNumber] ??= { num: phaseNumber, items: [] };
      phaseMap[phaseNumber].items.push(...extractDomainItems(domain));
    } else {
      expandedDomains.push(domain);
    }
  }

  const phases = Object.values(phaseMap).sort((a, b) => a.num - b.num);

  const titles = expandedDomains.map((domain) => domain.domainName || 'Unknown');
  const colors = assignCategoryColors(titles);
  const expandedCategories = expandedDomains.map((domain, i) => ({
    id: domain.domainName?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
    title: titles[i],
    color: colors[titles[i]],
    items: extractDomainItems(domain),
  }));

  return { phases, expandedCategories };
}
