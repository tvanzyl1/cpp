# Convention Centre Bay Count

A mobile-first dashboard showing the available bays reported for the City of Perth Parking Convention Centre.

## Local use

```sh
npm run refresh
npm test
```

Serve this folder with any static HTTP server to preview `index.html`. The page reads `data.json`; it checks that snapshot every 30 seconds. The source site’s embedded availability app also refreshes on a 30-second interval.

## GitHub Pages

1. Push the repository to GitHub.
2. In **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
3. The workflow deploys on pushes to `main`, can be run manually, and refreshes the deployed snapshot on a five-minute schedule.

The workflow fetches the City’s public parking feed on the server, so the browser does not need cross-origin access to the City website. GitHub Actions scheduled workflows have a five-minute minimum interval; the dashboard checks more often than the underlying snapshot can be refreshed. Scheduled runs can also be delayed by GitHub.
