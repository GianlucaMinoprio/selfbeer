import { NextResponse } from 'next/server';

// In-memory state — works on Vercel because the same warm instance
// handles both the POST from the Pi and the rapid GET polls from the browser
let beerMachineStatus: 'open' | 'closed' | 'underage' = 'closed';
let openedAt: number | null = null;
let closeTimeout: NodeJS.Timeout | null = null;

const AUTO_CLOSE_DURATION = 30000;
const UNDERAGE_MESSAGE_DURATION = 5000;

export async function GET() {
  let remainingTime = null;

  if (beerMachineStatus === 'open' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, AUTO_CLOSE_DURATION - elapsed);
    if (remainingTime === 0) {
      beerMachineStatus = 'closed';
      openedAt = null;
    }
  } else if (beerMachineStatus === 'underage' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, UNDERAGE_MESSAGE_DURATION - elapsed);
    if (remainingTime === 0) {
      beerMachineStatus = 'closed';
      openedAt = null;
    }
  }

  return NextResponse.json({
    status: beerMachineStatus,
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

    beerMachineStatus = status;

    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }

    if (status === 'open') {
      openedAt = Date.now();
      closeTimeout = setTimeout(() => {
        beerMachineStatus = 'closed';
        openedAt = null;
        closeTimeout = null;
      }, AUTO_CLOSE_DURATION);
    } else if (status === 'underage') {
      openedAt = Date.now();
      closeTimeout = setTimeout(() => {
        beerMachineStatus = 'closed';
        openedAt = null;
        closeTimeout = null;
      }, UNDERAGE_MESSAGE_DURATION);
    } else {
      openedAt = null;
    }

    let remainingTime = null;
    if (status === 'open') remainingTime = AUTO_CLOSE_DURATION;
    else if (status === 'underage') remainingTime = UNDERAGE_MESSAGE_DURATION;

    return NextResponse.json({
      status: beerMachineStatus,
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
