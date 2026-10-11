# TicketGuzo — fixed full-stack demo

React + Vite frontend, Express backend and MySQL database.

## Run

1. Copy `server/.env.example` to `server/.env` and set your MySQL password, `FRONTEND_URL` (for example, `http://localhost:5173`), and Chapa secret key in `CHAPA_SECRET_KEY`.
2. From `tg`: `npm install`
3. From `tg/client`: `npm install`
4. From `tg/server`: `npm install`
5. Start backend: `cd server` then `npm run dev`
6. In a second terminal start frontend: `cd client` then `npm run dev`
7. Open http://localhost:5173

The backend automatically creates the configured database and required tables and seeds routes if the routes table is empty. Default database name is `TicketGuzo_demo`.

Admin password: `G@guzoticket`

Chapa checkout runs from the backend: keep `CHAPA_SECRET_KEY` in `server/.env` and never add it to a `VITE_*` variable or frontend code. The backend initializes payments and verifies the transaction, amount, and currency with Chapa before marking a booking as paid. Use a Chapa test key for testing and a live key only for production.
