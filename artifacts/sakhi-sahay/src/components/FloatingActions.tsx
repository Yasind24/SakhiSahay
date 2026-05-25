import { useEffect, useState } from "react";
import { ArrowUp, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean(window.navigator.standalone))
  );
}

export default function FloatingActions() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canShowInstall, setCanShowInstall] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setCanShowInstall(!isStandaloneDisplay());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanShowInstall(true);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setCanShowInstall(false);
    };

    const handleScroll = () => setShowScrollTop(window.scrollY > 360);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      window.alert("Use your browser menu to install SakhiSahay on this device.");
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <>
      {canShowInstall && (
        <button
          type="button"
          onClick={installApp}
          title="Install SakhiSahay"
          aria-label="Install SakhiSahay"
          className="fixed bottom-5 left-4 z-[1200] inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 shadow-lg transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:left-5"
        >
          <Download className="h-5 w-5" />
        </button>
      )}

      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to top"
          aria-label="Scroll to top"
          className="fixed bottom-5 right-4 z-[1200] inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 sm:right-5"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
