"use client";

import { Sparkles } from "lucide-react";

/**
 * Badge displayed on all AI-generated content to make it clear
 * the content is a suggestion and requires dentist review.
 */
export default function AISuggestedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold uppercase tracking-wide">
      <Sparkles size={10} />
      AI-suggested — review before saving
    </span>
  );
}
