# Loan Shift

A small, playable loan-offer game. Tune the principal, term, and APR for each client, then make the offer and see how well it balances their need, monthly budget, and total interest.

## Run locally

For a local preview, run a static server from this directory:

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

Open `http://localhost:4173/`; the root page redirects to the game in `docs/`.

GitHub Pages is configured to publish from the `main` branch's `/docs` folder. The game files in `docs/` are the published site.

The game is a simulation for learning and entertainment, not financial advice.