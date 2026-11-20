# Surf camp room board

A room-by-night board for the General Luna surf camp. It reads the **Siargao Booking Map** Google Sheet and updates itself every minute.

**Data path:** original booking map → (hourly scheduled sync) → *Copy of Copie de Siargao | Booking Map 24/25* → Apps Script web app (`apps-script/Code.gs`) → `index.html`. `SCRIPT_URL` in `index.html` is already set to the deployed web app.

`index.html` is the whole page. It reads the sheet the way the team already fills it in:

- **Tabs:** the half-year tabs named like `2026 2/2` and `2027 1/2`. New tabs are picked up automatically.
- **Rooms:** taken from the room letters in row 9 (A, B, C1–D2, E, V1, V2).
- **Package:** the cell colour (Balance, Surf, Yoga, Create Your Own, Airbnb, purple). Grey means not yet confirmed, and grey in V1/V2 means staff.
- **Stay:** starts at a name in capitals, such as `NAME (0123)`, and lasts as long as the coloured cells continue.
- **Add-ons and transfers:** read from lines like `S - 3; VA - 1`, `Pick up - 2.05pm` and `GL Drop`. `(transfer)` marks a room move.

## Turning on live data (one-time, about 5 minutes)

GitHub Pages can't read a Google Sheet directly, so a small Google Apps Script reads it for the page:

1. Open the booking map sheet and go to **Extensions → Apps Script**.
2. Replace the editor contents with [`apps-script/Code.gs`](apps-script/Code.gs) and save.
3. Click **Deploy → New deployment**, choose **Web app**, and set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, approve the access prompt, and copy the **Web app URL**. It ends in `/exec`.
5. In `index.html`, paste that URL into `const SCRIPT_URL = "";` and commit.
6. Turn on **Settings → Pages → Deploy from branch → `main` / root**. The board is then at `https://<user>.github.io/<repo>/`.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** to keep the same URL.

## Privacy

With **Anyone** access, everyone who has the `/exec` URL can read guest names, booking numbers and dates. If this repo is public, the URL is visible in `index.html`. To limit who can see the data, keep the repo private, or set the script's access to people in your Google Workspace.
