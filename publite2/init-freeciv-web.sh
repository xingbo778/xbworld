#!/usr/bin/env bash

# Starts freeciv-proxy and freeciv-web.
# This script is started by civlauncher.py in publite2.

export PATH="/usr/local/opt/openjdk@17/bin:/usr/local/opt/tomcat@10/bin:/usr/local/bin:$PATH"
export FREECIV_DATA_PATH="${HOME}/freeciv/share/freeciv/"

if [ "$#" -ne 6 ]; then
  echo "init-freeciv-web.sh error: incorrect number of parameters." >&2
  exit 1
fi

declare -a args

addArgs() {
  local i=${#args[*]}
  for v in "$@"; do
    args[i]=${v}
    let i++
  done
}

echo "init-freeciv-web.sh port ${2}"

addArgs --debug 1
addArgs --port "${2}"
addArgs --Announce none
addArgs --exit-on-end
addArgs --meta --keep --Metaserver "http://${4}"
addArgs --type "${5}"
addArgs --read "pubscript_${6}.serv"
addArgs --log "../logs/freeciv-web-log-${2}.log"
addArgs --quitidle 20

if [ -f "${6}.ruleset" ] ; then
  addArgs --ruleset "$(cat "${6}.ruleset")"
fi

savesdir=${1}
addArgs --saves "${savesdir}" --scenarios "${savesdir}"

export FREECIV_SAVE_PATH=${savesdir}
export FREECIV_SCENARIO_PATH=${savesdir}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.venv/bin/activate" 2>/dev/null
python3 ../xbworld-proxy/freeciv-proxy.py "${3}" > "../logs/freeciv-proxy-${3}.log" 2>&1 &
proxy_pid=$! &&
${HOME}/freeciv/bin/freeciv-web "${args[@]}" > /dev/null 2> "../logs/freeciv-web-stderr-${2}.log"

rc=$?;
kill -9 $proxy_pid;
exit $rc
