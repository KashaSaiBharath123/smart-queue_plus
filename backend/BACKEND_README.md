# SmartQueue+ — Backend API

Node.js + Express + MongoDB + Socket.IO

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env → set MONGO_URI (local or Atlas)

# 3. Start dev server (auto-reload)
npm run dev

# 4. Production
npm start
```

Server starts at **http://localhost:5000**

> **No MongoDB?** The API automatically falls back to in-memory seed data so you can develop and test without a running database instance.

---

## File Structure

```
smartqueue-backend/
├── server.js                  ← Entry point (Express + Socket.IO)
├── package.json
├── .env.example
├── config/
│   └── db.js                  ← Mongoose connection helper
├── models/
│   ├── Counter.js
│   ├── Queue.js
│   └── CartHold.js
├── routes/
│   ├── counters.js            ← CRUD for billing counters
│   ├── queue.js               ← Join, call next, status updates
│   ├── cartHold.js            ← Deposit / retrieve cart + slots
│   └── admin.js               ← Stats & history
└── middleware/
    └── errorHandler.js        ← Central error middleware
```

---

## API Reference

### Counters  `/api/counters`

| Method | Path       | Body                          | Description            |
|--------|------------|-------------------------------|------------------------|
| GET    | /          | —                             | List all counters      |
| GET    | /:id       | —                             | Get single counter     |
| POST   | /          | `{ name, number, type }`      | Create counter         |
| PUT    | /:id       | any Counter fields            | Update counter         |
| DELETE | /:id       | —                             | Delete counter         |

`type` values: `regular` · `express` · `priority`

---

### Queue  `/api/queue`

| Method | Path                  | Body / Params             | Description                      |
|--------|-----------------------|---------------------------|----------------------------------|
| GET    | /                     | —                         | All active entries (admin)       |
| GET    | /counter/:counterId   | —                         | Queue for a specific counter     |
| GET    | /token/:tokenId       | —                         | Look up a single token           |
| POST   | /join                 | `{ customerName, customerPhone, counterId, counterNumber }` | Join queue & get token |
| POST   | /next/:counterId      | —                         | Call next waiting customer       |
| PUT    | /:id/status           | `{ status }`              | Update entry status              |
| DELETE | /:id                  | —                         | Cancel / remove token            |

`status` values: `waiting` → `called` → `serving` → `done` · `cancelled`

---

### Cart Hold  `/api/cart-hold`

| Method | Path                    | Body / Params                                   | Description              |
|--------|-------------------------|-------------------------------------------------|--------------------------|
| GET    | /                       | —                                               | All hold records         |
| GET    | /active                 | —                                               | Active holds only        |
| GET    | /slots                  | —                                               | Slot availability map    |
| GET    | /token/:tokenId         | —                                               | Look up by token ID      |
| POST   | /deposit                | `{ customerName, customerPhone, customerId?, notes? }` | Deposit cart (₹20) |
| PUT    | /retrieve/:tokenId      | —                                               | Retrieve cart + refund   |
| PUT    | /expire/:tokenId        | —                                               | Mark expired (admin)     |

---

### Admin  `/api/admin`

| Method | Path      | Description                          |
|--------|-----------|--------------------------------------|
| GET    | /stats    | Dashboard stats + hourly traffic     |
| GET    | /history  | Last 50 served customers             |

---

## Socket.IO Events (server → client)

| Event              | Payload                                      | Trigger                      |
|--------------------|----------------------------------------------|------------------------------|
| `counters-updated` | `Counter[]`                                  | Any counter change           |
| `queue-updated`    | `{ counterId, entry }`                       | Any queue entry change       |
| `customer-called`  | `{ tokenId, tokenNumber, counterNumber }`    | When a customer is called    |
| `cart-hold-updated`| `{ action, hold }`                           | Deposit / retrieve / expire  |

### Frontend usage example
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');

socket.on('customer-called', ({ tokenNumber, counterNumber }) => {
  alert(`Token #${tokenNumber} — please go to Counter ${counterNumber}`);
});

socket.on('counters-updated', (counters) => {
  setCounters(counters);   // React state update
});
```

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use **MongoDB Atlas** URI in `MONGO_URI`
- [ ] Deploy to **Railway**, **Render**, or **AWS EC2**
- [ ] Enable CORS for your frontend domain in `server.js`
- [ ] Add rate-limiting (`express-rate-limit`) for production
- [ ] Add JWT auth middleware for admin routes

---

## License
MIT — SmartQueue+ 🇮🇳
