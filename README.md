# ODDLY

**Explore the past. Imagine the impossible.**

Two browser-based experiences, no backend and no account:

## Internet Time Machine
Type any website and browse its history from the Internet Archive (Wayback Machine).

- Monthly captures from the CDX index, with automatic fallback routes if the archive blocks direct browser requests
- Year histogram, month grid and a scrubber across every snapshot; highlighted months mean the page content actually changed
- **Time travel** autoplay, earlier/later, random snapshot
- **Compare** two moments side by side
- Shareable links (`#/time?u=google.com&t=20010615000000`), recent searches, EN / ID

## What If Machine
Six thought experiments, each with a small model you steer with sliders and presets. All numbers are computed live and every assumption is shown on the page.

1. 100 billion people on Earth (land, food, water, energy limits)
2. The Sun disappears (8.3 minute delay, two-box cooling model)
3. The internet goes dark for 7 days (sector impact model)
4. The Moon moves or vanishes (tides, month length, eclipses, Roche limit)
5. A different day length (equator weight, bulge, breakup speed)
6. A tunnel through a planet (animated, same time for any chord)

Results are educational models, not forecasts. Each setup has a shareable link (`#/whatif/moon?dist=0.5`).

## Develop
```
npm install
npm run dev      # local dev server
npm test         # unit tests for the archive client and all physics models
npm run build
```

## Deploy
The GitHub Actions workflow tests, builds and deploys to GitHub Pages on every push to `main`. In Settings → Pages choose **GitHub Actions** as the source.

## Notes
- The Time Machine depends on the public Internet Archive. Some captures block embedding; each frame has an "open directly" link.
- Preferences and recent searches stay in your browser.
