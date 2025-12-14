/**
 * Notification sound utility
 * Plays a notification sound when new notifications arrive
 */

// Check if sound is enabled (stored in localStorage)
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true; // Default to enabled on server
  
  const stored = localStorage.getItem("notificationSoundEnabled");
  if (stored === null) return true; // Default to enabled
  return stored === "true";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("notificationSoundEnabled", enabled.toString());
}

/**
 * Play a notification sound using Web Audio API
 * Creates a pleasant notification chime
 */
export function playNotificationSound(type: "task" | "message" | "default" = "default"): void {
  if (typeof window === "undefined") return;
  if (!isNotificationSoundEnabled()) return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different sound patterns for different notification types
    const frequencies = {
      task: [523.25, 659.25, 783.99], // C5, E5, G5 - pleasant task notification
      message: [440, 554.37, 659.25], // A4, C#5, E5 - message notification
      default: [523.25, 659.25], // C5, E5 - simple default
    };

    const freq = frequencies[type];
    const duration = 0.15; // Duration of each tone
    const gap = 0.05; // Gap between tones

    freq.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine"; // Smooth sine wave

      // Envelope: quick attack, smooth decay
      const startTime = audioContext.currentTime + index * (duration + gap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Smooth decay

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    // Fallback: Try using HTML5 Audio if Web Audio API fails
    console.warn("Web Audio API not available, trying fallback:", error);
    playNotificationSoundFallback();
  }
}

/**
 * Fallback notification sound using HTML5 Audio
 * Creates a simple beep sound
 */
function playNotificationSoundFallback(): void {
  if (typeof window === "undefined") return;
  
  try {
    // Create a simple beep using a data URL
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}

/**
 * Play notification sound based on notification type
 */
export function playNotificationSoundByType(notificationType: string): void {
  if (notificationType.startsWith("TASK")) {
    playNotificationSound("task");
  } else if (notificationType.startsWith("MESSAGE")) {
    playNotificationSound("message");
  } else {
    playNotificationSound("default");
  }
}

