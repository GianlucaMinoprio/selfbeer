import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const AUTO_CLOSE_DURATION = 30000; // 30 seconds
const UNDERAGE_MESSAGE_DURATION = 5000; // 5 seconds

const KEY = 'selfbeer:status';

interface StatusData {
  status: 'open' | 'closed' | 'underage';
  openedAt: number | null;
}

async function getStatus(): Promise<StatusData> {
  const data = await redis.get<StatusData>(KEY);
  return data ?? { status: 'closed', openedAt: null };
}

export async function GET() {
  const data = await getStatus();
  let { status, openedAt } = data;
  let remainingTime = null;

  if (status === 'open' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, AUTO_CLOSE_DURATION - elapsed);
    if (remainingTime === 0) {
      status = 'closed';
      openedAt = null;
      await redis.set(KEY, { status, openedAt });
    }
  } else if (status === 'underage' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, UNDERAGE_MESSAGE_DURATION - elapsed);
    if (remainingTime === 0) {
      status = 'closed';
      openedAt = null;
      await redis.set(KEY, { status, openedAt });
    }
  }

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    remainingTime,
    openedAt: openedAt ? new Date(openedAt).toISOString() : null,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status } = body;

    if (status !== 'open' && status !== 'closed' && status !== 'underage') {
      return NextResponse.json(
        { error: 'Invalid status. Must be "open", "closed", or "underage"' },
        { status: 400 }
      );
    }

    const openedAt = status === 'closed' ? null : Date.now();
    // Auto-expire the key so it self-cleans
    const ttl = status === 'open' ? AUTO_CLOSE_DURATION / 1000 : status === 'underage' ? UNDERAGE_MESSAGE_DURATION / 1000 : 0;

    if (status === 'closed') {
      await redis.set(KEY, { status, openedAt });
    } else {
      await redis.set(KEY, { status, openedAt }, { ex: Math.ceil(ttl) + 5 });
    }

    let remainingTime = null;
    if (status === 'open') remainingTime = AUTO_CLOSE_DURATION;
    else if (status === 'underage') remainingTime = UNDERAGE_MESSAGE_DURATION;

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      remainingTime,
      openedAt: openedAt ? new Date(openedAt).toISOString() : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
