"use client";

import { useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import Image from "next/image";
import { getUniversalLink } from "@selfxyz/core";

const MINIMUM_AGE = Number(process.env.NEXT_PUBLIC_MINIMUM_AGE || 21);
const POUR_DURATION = 30000; // match backend POUR_MS

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
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const isOpen = status === "open";
  const isUnderage = status === "underage";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center px-6 py-6">
      {/* Underage Overlay */}
      {isUnderage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 backdrop-blur-sm">
          <div className="text-center space-y-6 max-w-md mx-4">
            <div className="text-8xl">🚫</div>
            <h2
              className="text-5xl font-bold text-red-400"
              style={{
                fontFamily: "Impact, sans-serif",
                textShadow:
                  "0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)",
              }}
            >
              ACCESS DENIED
            </h2>
            <p className="text-red-200 text-lg">
              You must be {MINIMUM_AGE}+ to use this machine.
            </p>
            {remainingTime !== null && (
              <div className="mt-4 space-y-2">
                <div className="w-64 mx-auto h-1.5 bg-red-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300 ease-linear"
                    style={{
                      width: `${(remainingTime / 5000) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bubbles when pouring */}
      {isOpen && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-2 h-2 bg-amber-300/20 rounded-full animate-bubble"
              style={{
                left: `${(i * 7) % 100}%`,
                animationDelay: `${(i * 1.3) % 5}s`,
                animationDuration: `${5 + ((i * 1.7) % 5)}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
        {/* LEFT - QR Code (primary action) */}
        <div className="flex flex-col items-center gap-6">
          {/* Status indicator */}
          <div
            className={`text-6xl font-bold tracking-wider transition-all duration-700 ${
              isOpen
                ? "text-green-400"
                : "text-amber-400"
            }`}
            style={{
              fontFamily: "Impact, sans-serif",
              textShadow: isOpen
                ? "0 0 15px #22c55e, 0 0 30px #22c55e, 0 0 45px #22c55e"
                : "0 0 15px #f59e0b, 0 0 30px #f59e0b",
            }}
          >
            {loading
              ? "..."
              : isOpen
              ? "POURING!"
              : "SCAN TO POUR"}
          </div>

          {/* QR Code */}
          <div className="relative bg-white p-4 rounded-2xl shadow-2xl">
            {selfLink ? (
              <QRCode value={selfLink} size={440} level="H" />
            ) : (
              <div className="w-[440px] h-[440px] flex items-center justify-center">
                <p className="text-gray-400">Loading...</p>
              </div>
            )}
          </div>

          {/* Pour progress */}
          {isOpen && remainingTime !== null && (
            <div className="w-full max-w-[440px] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-400 font-semibold">Pouring...</span>
                <span className="text-green-400 font-semibold">
                  {Math.ceil(remainingTime / 1000)}s
                </span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-amber-400 transition-all duration-300 ease-linear rounded-full"
                  style={{
                    width: `${(remainingTime / POUR_DURATION) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Don't have the app? */}
          {!isOpen && (
            <div className="flex items-center gap-6 mt-2">
              <p className="text-gray-500 text-sm">
                Need the Self app?
              </p>
              <div className="flex gap-3">
                <div className="bg-white p-1.5 rounded-lg">
                  <QRCode
                    value="https://apps.apple.com/us/app/self-zk/id6478563710"
                    size={60}
                    level="H"
                  />
                  <p className="text-center text-gray-600 text-[9px] mt-0.5">
                    iOS
                  </p>
                </div>
                <div className="bg-white p-1.5 rounded-lg">
                  <QRCode
                    value="https://play.google.com/store/apps/details?id=com.proofofpassportapp&pli=1"
                    size={60}
                    level="H"
                  />
                  <p className="text-center text-gray-600 text-[9px] mt-0.5">
                    Android
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - Animation & Instructions */}
        <div className="flex flex-col items-center gap-8">
          {/* Beer Glass */}
          <div className="relative">
            <div className="relative w-44 h-64 bg-gradient-to-b from-white/10 to-white/5 rounded-b-3xl border-4 border-white/15 backdrop-blur-sm overflow-hidden">
              {/* Beer liquid */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 transition-all ease-out ${
                  isOpen ? "h-[85%] duration-[2000ms]" : "h-0 duration-[1000ms]"
                }`}
              >
                {/* Foam */}
                <div className="absolute -top-6 left-0 right-0 h-10 bg-gradient-to-b from-yellow-50 via-yellow-100 to-amber-200 rounded-t-lg">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-white/50 rounded-full animate-foam"
                      style={{
                        left: `${10 + i * 15}%`,
                        top: `${(i * 15) % 80}%`,
                        animationDelay: `${(i * 0.3) % 2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Glass shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Glass base */}
            <div className="w-20 h-3 mx-auto bg-white/15 rounded-b-lg" />
          </div>

          {/* Instructions */}
          <div className="max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-amber-400">
                Ready for a Beer?
              </h2>
              <Image
                src="/self-logo.jpg"
                alt="Self.xyz"
                width={60}
                height={20}
                className="opacity-80 rounded-md"
              />
            </div>

            <div className="space-y-3">
              {[
                { n: "1", title: "Download Self App", desc: "Get it from your app store", color: "bg-amber-500" },
                { n: "2", title: "Scan Your Passport", desc: "The app securely reads your age", color: "bg-amber-500" },
                { n: "3", title: `Prove You're ${MINIMUM_AGE}+`, desc: "Scan the QR code on the left", color: "bg-amber-500" },
                { n: "✓", title: "Pour Your Beer!", desc: "The tap opens automatically", color: "bg-green-500" },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-7 h-7 ${step.color} rounded-full flex items-center justify-center text-black text-sm font-bold`}
                  >
                    {step.n}
                  </div>
                  <div>
                    <span className="text-gray-200 text-sm font-medium">
                      {step.title}
                    </span>
                    <span className="text-gray-500 text-sm"> — {step.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-600 text-xs text-center pt-2">
              Powered by Self.xyz — Zero-knowledge age verification
            </p>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes bubble {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes foam {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-6px) scale(1.2);
            opacity: 0.8;
          }
        }

        .animate-bubble {
          animation: bubble linear infinite;
        }

        .animate-foam {
          animation: foam 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
