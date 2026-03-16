import { NextResponse } from 'next/server';

// Simple in-memory state (will reset on server restart)
// In production, you might want to use a database or file storage
let beerMachineStatus: 'open' | 'closed' | 'underage' = 'closed';
let openedAt: number | null = null;
let closeTimeout: NodeJS.Timeout | null = null;

const AUTO_CLOSE_DURATION = 30000; // 30 seconds in milliseconds
const UNDERAGE_MESSAGE_DURATION = 5000; // 5 seconds for underage message

function scheduleAutoClose() {
  // Clear any existing timeout
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }

  // Schedule automatic close after 30 seconds
  closeTimeout = setTimeout(() => {
    beerMachineStatus = 'closed';
    openedAt = null;
    closeTimeout = null;
  }, AUTO_CLOSE_DURATION);
}

function scheduleUnderageTimeout() {
  // Clear any existing timeout
  if (closeTimeout) {
    clearTimeout(closeTimeout);
  }

  // Schedule automatic close after 5 seconds for underage
  closeTimeout = setTimeout(() => {
    beerMachineStatus = 'closed';
    openedAt = null;
    closeTimeout = null;
  }, UNDERAGE_MESSAGE_DURATION);
}

export async function GET() {
  let remainingTime = null;

  if (beerMachineStatus === 'open' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, AUTO_CLOSE_DURATION - elapsed);

    // If time has expired, close it
    if (remainingTime === 0) {
      beerMachineStatus = 'closed';
      openedAt = null;
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    }
  } else if (beerMachineStatus === 'underage' && openedAt) {
    const elapsed = Date.now() - openedAt;
    remainingTime = Math.max(0, UNDERAGE_MESSAGE_DURATION - elapsed);

    // If time has expired, close it
    if (remainingTime === 0) {
      beerMachineStatus = 'closed';
      openedAt = null;
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    }
  }

  return NextResponse.json({
    status: beerMachineStatus,
    timestamp: new Date().toISOString(),
    remainingTime,
    openedAt: openedAt ? new Date(openedAt).toISOString() : null
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

    if (status === 'open') {
      openedAt = Date.now();
      scheduleAutoClose();
    } else if (status === 'underage') {
      openedAt = Date.now();
      scheduleUnderageTimeout();
    } else {
      openedAt = null;
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    }

    let remainingTime = null;
    if (status === 'open') {
      remainingTime = AUTO_CLOSE_DURATION;
    } else if (status === 'underage') {
      remainingTime = UNDERAGE_MESSAGE_DURATION;
    }

    return NextResponse.json({
      status: beerMachineStatus,
      timestamp: new Date().toISOString(),
      remainingTime,
      openedAt: openedAt ? new Date(openedAt).toISOString() : null
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
