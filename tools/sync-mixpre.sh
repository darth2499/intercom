#!/bin/sh
# Refresh mixpre.html from the mixpre-remote repo (main, via gh) and print a diffstat.
set -e
cd "$(dirname "$0")/.."
# gh (this Mac's login) keeps working when the repo is private
gh api repos/darth2499/mixpre-remote/contents/web/index.html -H "Accept: application/vnd.github.raw" > mixpre.html.new
if [ -f mixpre.html ]; then diff -u mixpre.html mixpre.html.new | diffstat 2>/dev/null || diff mixpre.html mixpre.html.new | wc -l; fi
mv mixpre.html.new mixpre.html
echo "mixpre.html: $(wc -c < mixpre.html) bytes"
