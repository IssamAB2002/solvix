# DevStudio Backend Scaffold

This backend is a clean Express + SQLite auth API for your React project.

## What it includes

- `POST /api/auth/signup`: register a new user
- `POST /api/auth/signin`: log in an existing user
- SQLite database in `backend/data/devstudio.db`
- JWT auth token generation

## Setup

1. Open the `backend` folder.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

4. Use the frontend at `http://localhost:5177` and backend at `http://localhost:4000`.
## Database options

This backend can run with one of three database modes.

- `sqlite` (default): local SQLite file at `backend/data/devstudio.db`
- `postgres`: use PostgreSQL with `POSTGRES_URL`
- `mongodb`: use MongoDB with `MONGODB_URI`

Create a `.env` file in `backend` with values like:

```env
PORT=4000
JWT_SECRET=your_secret_here
DB_TYPE=postgres
POSTGRES_URL=postgres://user:password@localhost:5432/devstudio
MONGODB_URI=mongodb://user:password@localhost:27017/devstudio
```

Use `DB_TYPE=mongodb` when you want MongoDB or `DB_TYPE=sqlite` to keep the built-in SQLite fallback.
## Notes

- Copy the `backend` folder to your backend project.
- Do not keep the `.env` secret key in source control for production.
- Replace `JWT_SECRET` with a strong value.
