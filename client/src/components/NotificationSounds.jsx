import React, { useEffect, useRef } from "react";
import axios from "axios";

export default function NotificationSounds() {
  const errorRef = useRef(null);

  useEffect(() => {
    const resInterceptor = axios.interceptors.response.use(
      (response) => {
        // Placeholder for success notifications if needed
        return response;
      },
      (error) => {
        const msg = error?.response?.data?.error?.toString() || "";
        if (/already\s+use(d)?/i.test(msg)) {
          try {
            console.debug(
              "NotificationSounds: playing error sound for message:",
              msg
            );
            errorRef.current?.play();
          } catch (e) {
            console.warn("Failed to play notification sound:", e);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  return <audio ref={errorRef} src="/sounds/error.mp3" preload="auto" />;
}
