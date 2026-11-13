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

/** Pre-normalization item: premiereDate is still the raw API date string. */
type RawItem<T extends McuItem> = Omit<T, 'premiereDate'> & { premiereDate?: string };

function normalizeShow(source: ApiShow): RawItem<TvItem>[] {
  const id = source.globalId;
  return (source.seasons ?? []).map((season, seasonIndex) => {
    // Use seasonNumber from API if available, otherwise index + 1
    const seasonNumber = season.seasonNumber ?? seasonIndex + 1;
    return {
      id: `${id}-season${seasonNumber}`,
      globalId: id,
      type: 'tv',
      title: source.title,
      seasonNumber,
      premiereDate: season.premiereDate || source.premiereDate,
      synopsis: source.synopsis,
      s3Url: source.s3Url,
      episodes: (season.episodes ?? []).map((episode) => ({
        title: episode.title,
        globalId: episode.globalId,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
      })),
    };
  });
}

function normalizeMovie(source: ApiMovie): RawItem<MovieItem> {
  return {
    id: source.globalId,
    globalId: source.globalId,
    type: source.type === 'SPECIAL' ? 'special' : 'movie',
    title: source.title,
    premiereDate: source.premiereDate,
    runtime: source.runtime,
    synopsis: source.synopsis,
    s3Url: source.s3Url,
  };
}

const dateValue = (d: string | undefined) => (d ? new Date(d).getTime() : NaN);

function extractDomainItems(domain: ApiDomain | undefined): McuItem[] {
  const items: RawItem<McuItem>[] = [
    ...(domain?.movies ?? []).map(normalizeMovie),
    // One item per season for TV
    ...(domain?.shows ?? []).flatMap(normalizeShow),
  ];

  items.sort((a, b) => dateValue(a.premiereDate) - dateValue(b.premiereDate));

  return items.map(
    (item) => ({ ...item, premiereDate: new Date(item.premiereDate ?? NaN).getFullYear() }) as McuItem,
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
      phaseMap[phaseNumber] ??= { num: phaseNumber, color: domain.color || '#4C8DFF', items: [] };
      phaseMap[phaseNumber].items.push(...extractDomainItems(domain));
    } else {
      expandedDomains.push(domain);
    }
  }

  const phases = Object.values(phaseMap).sort((a, b) => a.num - b.num);

  const expandedCategories = expandedDomains.map((domain) => ({
    id: domain.domainName?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
    title: domain.domainName || 'Unknown',
    color: domain.color || '#B91C1C',
    blurb: domain.blurb || '',
    items: extractDomainItems(domain),
  }));

  return { phases, expandedCategories };
}
