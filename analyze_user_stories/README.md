# User-story analysis and recommendation service

## Run the API

```bash
uvicorn main:app --reload
```

The production image runs the same `main:app` entrypoint. Apply the SQL files in
`migrations/` before starting a new environment.

## Recommendation configuration

The production ranker is deterministic and reports a similarity score, not a
probability. The main settings are:

- `REDUNDANCY_W_SEMANTIC`, `REDUNDANCY_W_ACTION`, `REDUNDANCY_W_OBJECT`,
  `REDUNDANCY_W_SUBJECT`, and `REDUNDANCY_W_TOKEN` (must each be in `[0,1]`
  and sum to `1`).
- `REDUNDANCY_HIGH_THRESHOLD`, `REDUNDANCY_SEMANTIC_HIGH_THRESHOLD`, and
  `REDUNDANCY_THRESHOLD` (the MEDIUM floor).
- `RECOMMENDATION_TOP_K` (positive integer, default `20`).
- `RECOMMENDATION_EMBEDDINGS_ENABLED` (default `false`). When enabled, install
  `requirements-recommendation.txt` and provide the configured local embedding
  model.
- `RECOMMENDATION_MODEL_VERSION` and `RECOMMENDATION_POLICY_VERSION`. Both are
  persisted with every candidate so a rollout can be audited and rolled back.

Spring publishes `REBUILD_GRAPH v2`. This service publishes chunked
`RECOMMENDATION_CANDIDATES v2` and `RECOMMENDATION_JOB_STATUS v2` events. Raw
story text must never be added to application logs or metrics.

## Optional experiments

```bash
python experiment.py --enable-bert --enable-sbert
```

Weak-label training remains experiment-only and is not used by the production
ranker.
