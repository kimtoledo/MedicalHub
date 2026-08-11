import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-violet-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-800/60 rounded-2xl mb-4">
          <WifiOff size={28} className="text-violet-300" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">You&apos;re offline</h1>
        <p className="text-violet-400 text-sm">
          Dentra.ph can&apos;t reach the network right now. Patient and clinical data is never
          cached for offline use, so please reconnect and try again.
        </p>
      </div>
    </div>
  );
}
