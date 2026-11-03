# 0007. Job search in Postgres, not a search engine or embeddings

**Status:** accepted

## Context

Search matched only exact text: "frontend" missed "Front-End", and typos found nothing. Options were
a search engine (Meilisearch, Elasticsearch), meaning-based search with embeddings, or Postgres's
own text search.

## Decision

Postgres:

- **Full-text search** with English word forms and prefixes, weighted toward title and skills.
- **A synonyms list.**
- **Typo tolerance** with edit distance (`fuzzystrmatch`) on titles, skills and company names.
- **Ranking**, with a fallback to jobs that match only some of the words.

Embeddings were left out on purpose: a separate project of the author's covers semantic search.

## Consequences

- No new service, and it runs on Neon's free plan.
- Results are explainable and covered by tests.
- It doesn't understand meaning ("build mobile apps" won't find "iOS Engineer"). Hybrid search with
  embeddings could be added later on top, with pgvector.
- Matching runs on every search without a search index. That's fine at this scale; a large catalogue
  would want a precomputed search column and an index.
