# Codebase Cleanup — Surgical Approach

**Date:** 2026-02-28
**Status:** Approved

## Goal

Clean up the QuantumDx codebase: remove dead code, fix type safety, consolidate duplicates, and fix configuration issues. All functionality preserved.

## Changes

### Stream 1: Delete Dead Code
- Delete `quantumDx-web/` directory (duplicate frontend)
- Delete `main.py` (empty file)

### Stream 2: Python Backend Cleanup
- Remove unused `import pandas as pd` from `quantum_engine.py`
- Move pandas import to function scope in `api.py`
- Add return type hints to `aggregator.py` and `quantum_engine.py`
- Tighten CORS to known domains

### Stream 3: Frontend Cleanup
- Replace hardcoded API URL with `VITE_API_URL` env variable
- Add `.env.example`
- Fix `as any` type bypasses in `LaunchCta.tsx`

### Stream 4: Dependency Hygiene
- Pin versions in `requirements.txt`

## Non-Goals
- No refactoring of app.py
- No new abstractions or modules
- No behavioral changes
