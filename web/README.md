# Beer Semaphore

A fun, animated semaphore-style UI for your beer machine! This Next.js app displays a vintage mechanical semaphore with neon beer bar aesthetics to show whether your beer machine is open or closed.

## Features

- Mechanical railway-style semaphore arm that rotates between open/closed positions
- Glowing neon sign with "OPEN" and "CLOSED" states
- Animated beer tap that pours when open
- Beer glass that fills with animated foam and bubbles
- Background bubble animations when open
- Auto-refreshing status every 2 seconds
- Simple REST API for your Raspberry Pi to update the status

## Getting Started

First, install dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the semaphore display.

## API Documentation

The app provides a simple REST API for your Raspberry Pi to update the beer machine status.

### Get Current Status

```bash
GET /api/status
```

**Response:**
```json
{
  "status": "open",
  "timestamp": "2025-10-23T17:00:00.000Z"
}
```

### Update Status

```bash
POST /api/status
Content-Type: application/json

{
  "status": "open"
}
```

**Valid status values:** `"open"` or `"closed"`

**Response:**
```json
{
  "status": "open",
  "timestamp": "2025-10-23T17:00:00.000Z"
}
```

### Example: Update from Raspberry Pi

```bash
# Set to open
curl -X POST http://localhost:3000/api/status \
  -H "Content-Type: application/json" \
  -d '{"status": "open"}'

# Set to closed
curl -X POST http://localhost:3000/api/status \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

You can integrate this into your Raspberry Pi beer machine controller to automatically update the semaphore display!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
