/* =========================================================
   NOVA AI — voice.js
   Voice input (Web Speech Recognition) and text-to-speech
   (SpeechSynthesis) with graceful degradation when unsupported.
========================================================= */

const NovaVoice = (() => {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let listening = false;

  function isRecognitionSupported() {
    return !!SpeechRecognitionImpl;
  }
  function isSpeechSupported() {
    return 'speechSynthesis' in window;
  }

  /**
   * Start listening for speech. Calls onResult(text) with the final
   * transcript, onEnd() when the mic stops, and onError(err) on failure.
   */
  function startListening({ onInterim, onResult, onEnd, onError }) {
    if (!isRecognitionSupported()) {
      onError && onError(new Error('Speech recognition is not supported in this browser.'));
      return;
    }
    if (listening) return;

    recognizer = new SpeechRecognitionImpl();
    recognizer.lang = 'en-US';
    recognizer.interimResults = true;
    recognizer.continuous = false;

    let finalTranscript = '';

    recognizer.onstart = () => { listening = true; };
    recognizer.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      if (onInterim) onInterim(finalTranscript + interim);
    };
    recognizer.onerror = (e) => { onError && onError(e); };
    recognizer.onend = () => {
      listening = false;
      onResult && onResult(finalTranscript.trim());
      onEnd && onEnd();
    };

    try {
      recognizer.start();
    } catch (err) {
      onError && onError(err);
    }
  }

  function stopListening() {
    if (recognizer && listening) recognizer.stop();
  }

  function isListening() {
    return listening;
  }

  /** Read text aloud, stripping markdown syntax for cleaner speech. */
  function speak(text) {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel(); // stop any current speech first
    const clean = text
      .replace(/```[\s\S]*?```/g, ' code block omitted ')
      .replace(/[#*_>`~-]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
  }

  return {
    isRecognitionSupported, isSpeechSupported,
    startListening, stopListening, isListening,
    speak, stopSpeaking,
  };
})();
