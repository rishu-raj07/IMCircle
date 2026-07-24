// Common shape every news source adapter follows — see HackerNewsProvider
// and RssNewsProvider for concrete implementations. Adding a new source
// later (a specific publisher's RSS, a government portal, an exam board)
// only ever means writing one more class like these two and adding it to
// PROVIDERS in newsIngestion.service.js — nothing else in the pipeline
// needs to change.
export class BaseNewsProvider {
  constructor({ id, name }) {
    this.id = id;
    this.name = name;
  }

  // Returns an array of PROVIDER-NATIVE raw items (whatever shape the
  // upstream API/feed returns). Must never throw for a single bad item —
  // only for "the whole source is unreachable", which the ingestion loop
  // catches so one dead provider never blocks the others.
  async fetchLatest() {
    throw new Error(`${this.constructor.name} did not implement fetchLatest()`);
  }

  // Maps one raw item to the common shape ingestion.service.js expects:
  // { title, summary, sourceName, sourceUrl, externalId, imageUrl,
  //   publishedAt (Date), categories, roles, industries, locations, keywords }
  // May be sync or async (the caller always `await`s it) — RssNewsProvider
  // uses async to support its og:image network fallback for feeds that
  // don't embed an image directly.
  normalizeItem(rawItem) {
    throw new Error(`${this.constructor.name} did not implement normalizeItem()`);
  }
}

export default BaseNewsProvider;
