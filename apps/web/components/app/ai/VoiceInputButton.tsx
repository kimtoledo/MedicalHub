"use client";

/**
 * VoiceInputButton — Web Speech API dictation component.
 *
 * Usage:
 *   <VoiceInputButton onTranscript={(text) => setValue((v) => v + text)} />
 *
 * Falls back gracefully if the browser does not support Web Speech API.
 * Shows an error if microphone access is denied.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  item(i: number): SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  item(i: number): SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type Status = "idle" | "listening" | "processing" | "unsupported" | "error";

export default function VoiceInputButton({
  onTranscript,
  lang = "en-PH",
  label = "Dictate",
  className = "",
}: {
  /** Called with the final transcript text when speech ends. */
  onTranscript: (text: string) => void;
  /** BCP-47 language tag. Default: en-PH (Philippine English). */
  lang?: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!isSupported) setStatus("unsupported");
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;
    setErrorMsg(null);
    setInterimText("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const rec = new SpeechRecognition() as SpeechRecognitionInstance;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    let finalTranscript = "";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results.item(i);
        const text = result.item(0).transcript;
        if (result.isFinal) {
          finalTranscript += text + " ";
        } else {
          interim = text;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setErrorMsg("Microphone access denied. Allow it in browser settings.");
      } else if (e.error === "no-speech") {
        setErrorMsg("No speech detected. Try again.");
      } else {
        setErrorMsg(`Speech error: ${e.error}`);
      }
      setStatus("error");
    };

    rec.onend = () => {
      setInterimText("");
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
      setStatus("idle");
    };

    recognitionRef.current = rec;
    rec.start();
    setStatus("listening");
  }, [isSupported, lang, onTranscript]);

  if (status === "unsupported") {
    return (
      <button
        type="button"
        disabled
        title="Voice input not supported in this browser"
        className={`p-1.5 rounded-lg text-gray-300 cursor-not-allowed ${className}`}
      >
        <MicOff size={15} />
      </button>
    );
  }

  const isListening = status === "listening";

  return (
    <div className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={isListening ? stop : start}
        title={isListening ? "Stop dictating" : label}
        className={`p-1.5 rounded-lg transition-all ${
          isListening
            ? "bg-red-100 text-red-600 animate-pulse"
            : status === "error"
            ? "bg-orange-100 text-orange-500"
            : "text-violet-400 hover:bg-violet-100 hover:text-violet-600"
        } ${className}`}
      >
        {status === "processing" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isListening ? (
          <Mic size={15} />
        ) : (
          <Mic size={15} />
        )}
      </button>

      {/* Interim text bubble */}
      {interimText && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-violet-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg max-w-[220px] whitespace-pre-wrap pointer-events-none">
          {interimText}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <p className="text-[10px] text-orange-500 mt-0.5 max-w-[180px]">{errorMsg}</p>
      )}
    </div>
  );
}
