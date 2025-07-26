"use client";

import { useEffect, useState } from "react";

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

export function useServiceWorker(swPath: string = "/sw.js") {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: false,
    registration: null,
    error: null
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(swPath);
        
        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
          isInstalling: !!registration.installing,
          isWaiting: !!registration.waiting,
          isControlling: !!navigator.serviceWorker.controller
        }));

        // Listen for service worker state changes
        if (registration.installing) {
          registration.installing.addEventListener("statechange", () => {
            setState(prev => ({
              ...prev,
              isInstalling: registration.installing?.state === "installing",
              isWaiting: registration.waiting?.state === "installed"
            }));
          });
        }

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isWaiting: true }));
              }
            });
          }
        });

      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Service worker registration failed"
        }));
      }
    };

    registerSW();

    // Listen for controller changes
    const handleControllerChange = () => {
      setState(prev => ({ ...prev, isControlling: !!navigator.serviceWorker.controller }));
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [swPath]);

  const updateServiceWorker = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const unregister = async () => {
    if (state.registration) {
      const success = await state.registration.unregister();
      if (success) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null,
          isInstalling: false,
          isWaiting: false,
          isControlling: false
        }));
      }
      return success;
    }
    return false;
  };

  return {
    ...state,
    updateServiceWorker,
    unregister
  };
}