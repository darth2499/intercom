#!/bin/sh
# Refresh mixpre.html from the mixpre-remote repo (main) and print a diffstat.
set -e
cd "$(dirname "$0")/.."
curl -fsSL https://raw.githubusercontent.com/darth2499/mixpre-remote/main/web/index.html -o mixpre.html.new
if [ -f mixpre.html ]; then diff -u mixpre.html mixpre.html.new | diffstat 2>/dev/null || diff mixpre.html mixpre.html.new | wc -l; fi
mv mixpre.html.new mixpre.html
echo "mixpre.html: $(wc -c < mixpre.html) bytes"
