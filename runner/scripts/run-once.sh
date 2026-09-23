#!/usr/bin/env bash
set -euo pipefail

main() {
  local script_dir repo_root output_dir node_bin dry_run
  local -a arguments=("$@")

  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  repo_root="$(cd -- "$script_dir/../.." && pwd -P)"
  output_dir="$repo_root/runner-output"
  node_bin="${NODE_BIN:-node}"
  dry_run=false

  while (($# > 0)); do
    case "$1" in
      --date | --source)
        if (($# < 2)); then
          printf 'Missing value for %s\n' "$1" >&2
          return 2
        fi
        shift 2
        ;;
      --output)
        if (($# < 2)); then
          printf 'Missing value for --output\n' >&2
          return 2
        fi
        output_dir="$2"
        shift 2
        ;;
      --save-raw)
        shift
        ;;
      --dry-run)
        dry_run=true
        shift
        ;;
      -h | --help)
        "$node_bin" "$repo_root/dist/runner/runOnce.js" --help
        return
        ;;
      *)
        printf 'Unknown option: %s\n' "$1" >&2
        return 2
        ;;
    esac
  done

  cd -- "$repo_root"
  export TZ="${TZ:-Europe/Bratislava}"
  if [[ "$dry_run" == false ]]; then
    install -d -m 0700 -- "$output_dir"
  fi
  "$node_bin" dist/runner/runOnce.js "${arguments[@]}"
}

main "$@"
