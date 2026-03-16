"use client";

import { useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import Image from "next/image";
import { getUniversalLink } from "@selfxyz/core";

const MINIMUM_AGE = Number(process.env.NEXT_PUBLIC_MINIMUM_AGE || 21);

export default function BeerSemaphore() {
  const [status, setStatus] = useState<"open" | "closed" | "underage">(
    "closed"
  );
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Self SDK: regenerate session each time machine returns to "closed"
  const [sessionKey, setSessionKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [prevStatus, setPrevStatus] = useState<string>("closed");

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Regenerate QR when status transitions back to "closed"
  useEffect(() => {
    if (status === "closed" && prevStatus !== "closed") {
      setSessionKey((k) => k + 1);
    }
    setPrevStatus(status);
  }, [status, prevStatus]);

  const selfLink = useMemo(() => {
    if (!isClient) return "";
    try {
      const sessionId = crypto.randomUUID();
      return getUniversalLink({
        version: 2,
        appName: "SelfBeer",
        scope: "beer",
        endpoint:
          process.env.NEXT_PUBLIC_ENDPOINT_URL ||
          "https://selfbeer.ngrok.app/api/verify",
        logoBase64:
          process.env.NEXT_PUBLIC_LOGO_URL ||
          "https://i.postimg.cc/kG8KkQCL/temp-Image-Byjart.avif",
        userId: sessionId,
        endpointType: "https",
        userIdType: "uuid",
        sessionId: sessionId,
        devMode: false,
        chainID: 42220,
        header: "",
        deeplinkCallback: "",
        userDefinedData: "beerSession",
        disclosures: {
          minimumAge: MINIMUM_AGE,
        },
      });
    } catch (error) {
      console.error("Failed to build Self link:", error);
      return "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, sessionKey]);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      setStatus(data.status);
      setRemainingTime(data.remainingTime);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // Poll every 1 second
    return () => clearInterval(interval);
  }, []);

  const isOpen = status === "open";
  const isUnderage = status === "underage";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center px-8 py-8">
      {/* Underage Modal Overlay */}
      {isUnderage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-yellow-900/90 to-red-900/90 border-4 border-yellow-500 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl animate-pulse">
            {/* Siren emojis in corners */}
            <div
              className="absolute -top-6 -left-6 text-6xl animate-spin"
              style={{ animationDuration: "1s" }}
            >
              🚨
            </div>
            <div
              className="absolute -top-6 -right-6 text-6xl animate-spin"
              style={{ animationDuration: "1s", animationDirection: "reverse" }}
            >
              🚨
            </div>
            <div
              className="absolute -bottom-6 -left-6 text-6xl animate-spin"
              style={{ animationDuration: "1s", animationDirection: "reverse" }}
            >
              🚨
            </div>
            <div
              className="absolute -bottom-6 -right-6 text-6xl animate-spin"
              style={{ animationDuration: "1s" }}
            >
              🚨
            </div>

            <div className="text-center space-y-4">
              <div className="text-5xl mb-4">🚨</div>
              <h2
                className="text-4xl font-bold text-yellow-400 mb-4"
                style={{ fontFamily: "Impact, sans-serif" }}
              >
                ACCESS DENIED
              </h2>
              <div className="text-5xl mb-4">🚨</div>
              <p className="text-yellow-100 text-xl font-semibold leading-relaxed">
                Are you really trying to get past Self verification AND machine
                intelligence?
              </p>

              {remainingTime !== null && (
                <div className="mt-6 space-y-3">
                  <p className="text-yellow-200 text-lg font-bold">
                    Resetting in: {Math.ceil(remainingTime / 1000)}s
                  </p>
                  <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border-2 border-yellow-600">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-red-600 transition-all duration-300 ease-linear"
                      style={{
                        width: `${(remainingTime / 5000) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animated background bubbles when open */}
      {isOpen && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-2 h-2 bg-amber-300/30 rounded-full animate-bubble"
              style={{
                left: `${(i * 5) % 100}%`,
                animationDelay: `${(i * 1.3) % 5}s`,
                animationDuration: `${5 + (i * 1.7) % 5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Three Column Layout */}
      <div className="relative z-10 grid grid-cols-3 gap-8 max-w-7xl w-full items-center">
        {/* LEFT COLUMN - Animation */}
        <div className="flex flex-col items-center gap-8">
          {/* Semaphore Pole and Arm Assembly */}
          <div className="relative flex flex-col items-center scale-75">
            {/* Top lamp housing */}
            <div className="relative mb-4">
              <div className="w-16 h-20 bg-gradient-to-b from-gray-700 to-gray-800 rounded-t-lg border-4 border-gray-900 flex items-center justify-center">
                <div
                  className={`w-10 h-10 rounded-full transition-all duration-500 ${
                    isOpen
                      ? "bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.8)]"
                      : isUnderage
                      ? "bg-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.8)]"
                      : "bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)]"
                  } animate-pulse`}
                />
              </div>
            </div>

            {/* Pole */}
            <div className="relative w-6 h-64 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 border-2 border-gray-700 shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Semaphore Arm Pivot Point */}
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
                {/* Pivot bolt */}
                <div className="w-8 h-8 bg-gray-800 rounded-full border-4 border-yellow-600 shadow-lg" />

                {/* Rotating Arm */}
                <div
                  className={`absolute top-1/2 left-1/2 origin-left transition-transform duration-1000 ease-in-out ${
                    isOpen ? "rotate-[-45deg]" : "rotate-[45deg]"
                  }`}
                  style={{ transformOrigin: "left center" }}
                >
                  <div className="relative w-48 h-12 -ml-0 -mt-6">
                    {/* Arm body */}
                    <div
                      className={`w-full h-full rounded-r-full border-4 transition-all duration-1000 ${
                        isOpen
                          ? "bg-gradient-to-r from-green-600 to-green-500 border-green-700 shadow-[0_0_40px_rgba(34,197,94,0.6)]"
                          : isUnderage
                          ? "bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-700 shadow-[0_0_40px_rgba(234,179,8,0.6)]"
                          : "bg-gradient-to-r from-red-700 to-red-600 border-red-800 shadow-[0_0_40px_rgba(220,38,38,0.6)]"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 rounded-r-full" />
                    </div>

                    {/* Arm stripe pattern */}
                    <div className="absolute inset-0 flex items-center justify-end pr-4 gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-8 bg-white/40 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support brackets */}
              {[0.3, 0.5, 0.7].map((position, i) => (
                <div
                  key={i}
                  className="absolute w-10 h-3 bg-gray-700 border-2 border-gray-800"
                  style={{ top: `${position * 100}%`, left: "-8px" }}
                />
              ))}
            </div>

            {/* Base */}
            <div className="w-32 h-8 bg-gradient-to-b from-gray-700 to-gray-900 border-4 border-gray-950 shadow-2xl" />
            <div className="w-40 h-4 bg-gray-950 rounded-b-lg" />
          </div>

          {/* Neon Sign Display */}
          <div className="relative scale-75">
            <div
              className={`text-7xl font-bold tracking-wider transition-all duration-1000 ${
                isOpen
                  ? "text-green-400 drop-shadow-[0_0_25px_rgba(34,197,94,1)]"
                  : isUnderage
                  ? "text-yellow-400 drop-shadow-[0_0_25px_rgba(234,179,8,1)]"
                  : "text-red-500 drop-shadow-[0_0_25px_rgba(220,38,38,1)]"
              }`}
              style={{
                fontFamily: "Impact, sans-serif",
                textShadow: isOpen
                  ? "0 0 10px #22c55e, 0 0 20px #22c55e, 0 0 30px #22c55e, 0 0 40px #22c55e"
                  : isUnderage
                  ? "0 0 10px #eab308, 0 0 20px #eab308, 0 0 30px #eab308, 0 0 40px #eab308"
                  : "0 0 10px #dc2626, 0 0 20px #dc2626, 0 0 30px #dc2626, 0 0 40px #dc2626",
              }}
            >
              {isOpen ? "OPEN" : isUnderage ? "DENIED" : "CLOSED"}
            </div>

            {/* Neon tube effect */}
            <div className="absolute inset-0 -z-10">
              <div
                className={`absolute inset-0 blur-xl transition-all duration-1000 ${
                  isOpen
                    ? "bg-green-500/30"
                    : isUnderage
                    ? "bg-yellow-500/30"
                    : "bg-red-600/30"
                }`}
              />
            </div>
          </div>

          {/* Beer Tap and Glass */}
          <div className="flex items-end gap-8 scale-75">
            {/* Beer Tap */}
            <div className="relative">
              <div className="w-16 h-32 bg-gradient-to-b from-yellow-700 to-yellow-900 rounded-t-3xl border-4 border-yellow-950 shadow-xl">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-12 bg-black rounded-lg border-2 border-gray-600" />
              </div>
              <div className="w-20 h-8 -ml-2 bg-gradient-to-b from-gray-800 to-black border-4 border-gray-900" />

              {/* Flowing beer animation */}
              {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-24">
                  <div className="w-full h-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 animate-flow opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent animate-flow" />
                </div>
              )}
            </div>

            {/* Beer Glass */}
            <div className="relative w-32 h-48 bg-gradient-to-b from-blue-100/10 to-blue-100/5 rounded-b-3xl border-4 border-blue-200/20 backdrop-blur-sm overflow-hidden">
              {/* Beer liquid */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 transition-all duration-2000 ease-out ${
                  isOpen ? "h-[85%]" : "h-0"
                }`}
              >
                {/* Foam */}
                <div className="absolute -top-8 left-0 right-0 h-12 bg-gradient-to-b from-yellow-50 via-yellow-100 to-amber-200">
                  {/* Foam bubbles */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-4 h-4 bg-white/60 rounded-full animate-foam"
                      style={{
                        left: `${i * 12}%`,
                        top: `${(i * 12.5) % 100}%`,
                        animationDelay: `${(i * 0.25) % 2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Glass shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Status text */}
          <div className="text-center">
            <p className="text-gray-400 text-lg">
              {loading
                ? "Checking status..."
                : `Machine is currently ${status}`}
            </p>
            {isOpen && remainingTime !== null && (
              <div className="mt-3 space-y-2">
                <p className="text-amber-400 text-xl font-bold">
                  Auto-closing in: {Math.ceil(remainingTime / 1000)}s
                </p>
                <div className="w-48 mx-auto h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-amber-500 transition-all duration-300 ease-linear"
                    style={{
                      width: `${(remainingTime / 30000) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <p className="text-gray-600 text-xs mt-1">
              Auto-refreshing every second
            </p>
          </div>
        </div>

        {/* MIDDLE COLUMN - App Store QR Codes */}
        <div className="flex flex-col items-center justify-center gap-6 p-4">
          <h3 className="text-amber-400 font-semibold text-center text-lg">
            Download Self.xyz App
          </h3>
          <div className="flex flex-col gap-4">
            {/* iOS App Store QR Code */}
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <div className="bg-white p-2 rounded-lg">
                <QRCode
                  value="https://apps.apple.com/us/app/self-zk/id6478563710"
                  size={140}
                  level="H"
                />
              </div>
              <p className="text-center text-gray-800 text-xs font-semibold mt-2">
                iOS App Store
              </p>
            </div>

            {/* Google Play QR Code */}
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <div className="bg-white p-2 rounded-lg">
                <QRCode
                  value="https://play.google.com/store/apps/details?id=com.proofofpassportapp&pli=1"
                  size={140}
                  level="H"
                />
              </div>
              <p className="text-center text-gray-800 text-xs font-semibold mt-2">
                Google Play
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - QR Code and Instructions */}
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          {/* QR Code Card */}
          <div className="relative bg-gradient-to-br from-amber-100 to-yellow-50 p-2 rounded-2xl border-4 border-amber-800 shadow-2xl">
            {/* Beer mug decoration corners */}
            <div className="absolute -top-3 -left-3 text-3xl">🍺</div>
            <div className="absolute -top-3 -right-3 text-3xl">🍺</div>

            <div className="bg-white p-2 rounded-lg shadow-inner">
              {selfLink ? (
                <QRCode
                  value={selfLink}
                  size={400}
                  level="H"
                />
              ) : (
                <div className="w-[400px] h-[400px] flex items-center justify-center">
                  <p className="text-gray-500">Loading QR Code...</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="max-w-md space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-left">
                <h2 className="text-xl font-bold text-amber-400 mb-1">
                  Ready for a Beer?
                </h2>
                <p className="text-gray-400 text-xs">
                  Verify your age to unlock the tap
                </p>
              </div>
              <Image
                src="/self-logo.jpg"
                alt="Self.xyz"
                width={70}
                height={23}
                className="opacity-90 hover:opacity-100 transition-opacity flex-shrink-0 rounded-lg"
              />
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700 space-y-2">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-amber-300 font-semibold mb-1">
                    Download Self.xyz App
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Get the Self app from your app store
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-amber-300 font-semibold mb-1">
                    Scan Your Passport
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Use the app to securely scan your passport
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-amber-300 font-semibold mb-1">
                    Prove You&apos;re {MINIMUM_AGE}+
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Scan the QR code above to verify your age
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-black font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-green-300 font-semibold mb-1">
                    Pour Your Beer!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Once verified, the machine opens for you
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-gray-500 text-xs">Powered by Self.xyz</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes bubble {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes flow {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes foam {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 0.9;
          }
        }

        .animate-bubble {
          animation: bubble linear infinite;
        }

        .animate-flow {
          animation: flow 0.8s linear infinite;
        }

        .animate-foam {
          animation: foam 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
