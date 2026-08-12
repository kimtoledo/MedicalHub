#!/usr/bin/env bash

set -euo pipefail

readonly WEB_PORT=5001
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v lsof >/dev/null 2>&1; then
  echo "Error: lsof is required to check port ${WEB_PORT}." >&2
  exit 1
fi

listener_pids="$(lsof -tiTCP:"${WEB_PORT}" -sTCP:LISTEN 2>/dev/null || true)"

if [[ -n "${listener_pids}" ]]; then
  project_listener_pids=""
  unsafe_listener_found=false

  while IFS= read -r listener_pid; do
    process_path="$(ps -p "${listener_pid}" -o comm= 2>/dev/null | sed 's/^[[:space:]]*//')"
    process_name="$(basename "${process_path}")"
    listener_cwd="$(lsof -a -p "${listener_pid}" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)"

    case "${listener_cwd}" in
      "${PROJECT_ROOT}"|"${PROJECT_ROOT}/"*)
        if [[ "${process_name}" == "node" || "${process_name}" == next-server* ]]; then
          project_listener_pids="${project_listener_pids} ${listener_pid}"
        else
          unsafe_listener_found=true
        fi
        ;;
      *)
        unsafe_listener_found=true
        ;;
    esac
  done <<< "${listener_pids}"

  if [[ "${unsafe_listener_found}" == true ]]; then
    echo "Error: port ${WEB_PORT} is occupied by a process outside this project:" >&2
    lsof -nP -iTCP:"${WEB_PORT}" -sTCP:LISTEN >&2
    echo >&2
    echo "The process was left running for safety." >&2
    echo "Close that process, then run: npm run dev:safe" >&2
    exit 1
  fi

  echo "Port ${WEB_PORT} has a stale Dentra.ph process. Stopping it..."
  kill ${project_listener_pids}

  for _ in {1..20}; do
    if ! lsof -tiTCP:"${WEB_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done

  listener_pids="$(lsof -tiTCP:"${WEB_PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${listener_pids}" ]]; then
    echo "The existing process did not stop gracefully. Force stopping it..."
    kill -9 ${listener_pids}
  fi
fi

echo "Starting the Dentra.ph frontend at http://localhost:${WEB_PORT}"
cd "${PROJECT_ROOT}"
exec npm run dev
