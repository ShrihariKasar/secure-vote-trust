# Defect & Remediation Log (BUGS_FOUND.md)

**Project Name**: Blockchain Voting with Face Authentication (`SecureVote Trust`)  
**Audit Date**: September 2, 2026  

---

## Defect Inventory & Resolution Matrix

| Bug ID | Severity | Category | Description | Root Cause | Fix & Remediation Status | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | HIGH | Configuration | Pydantic Settings V2 raised `ValidationError` due to unhandled `.env` entries (`VITE_API_BASE_URL`). | Strict `extra="forbid"` default in Pydantic Settings V2 without explicit ignore config. | Added `model_config = SettingsConfigDict(extra="ignore", case_sensitive=True, env_file=".env")` in `backend/app/config.py`. | **VERIFIED FIXED** |
| **BUG-002** | HIGH | Error System | Double-voting attempt returned default Starlette JSON instead of standardized error payload. | `HTTPException` handler was not registered separately from `Exception` handler in `main.py`. | Created dedicated `@app.exception_handler(HTTPException)` returning `{ "success": false, "error": { "code": "VOTER_ALREADY_VOTED", "message": "..." } }`. | **VERIFIED FIXED** (Pytest + QA Runner Passed) |
| **BUG-003** | MEDIUM | Blockchain | `validate_chain` in `blockchain_service.py` only checked prev_hash linkage between adjacent blocks, missing single-block tampering. | Missing individual block header hash re-computation check in loop. | Updated `validate_chain` to verify individual block header digests and tamper indicators. | **VERIFIED FIXED** (TC-BC-02 Passed) |
| **BUG-004** | MEDIUM | Frontend Build | `npx tsc --noEmit` failed due to `exactOptionalPropertyTypes: true` in `tsconfig.json`. | Setting `body: undefined` in `fetch` call and `status: undefined` in route query objects violates exact optional types. | Refactored `apiClient.ts` and admin route components to omit `undefined` keys dynamically. | **VERIFIED FIXED** (`npx tsc` 0 errors) |
| **BUG-005** | LOW | Windows CLI | `seed_demo_data.py` failed with `UnicodeEncodeError: 'charmap' codec can't encode character '\u2714'` on Windows PowerShell. | Console default encoding (`cp1252`) cannot print Unicode checkmark characters `\u2714`. | Replaced Unicode checkmarks with ASCII indicators `[+]` and `[-]`. | **VERIFIED FIXED** (`seed_demo_data.py` exited 0) |

---

## Resolution Verification Summary

- **Total Defects Identified**: 5
- **Critical Defects**: 0
- **High Defects**: 2 (Resolved)
- **Medium Defects**: 2 (Resolved)
- **Low Defects**: 1 (Resolved)
- **Remaining Open Defects**: 0
