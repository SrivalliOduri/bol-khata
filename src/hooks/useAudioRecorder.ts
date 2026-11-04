import { useCallback, useRef, useState } from 'react';

interface RecorderState {
  isRecording: boolean;
  isInitializing: boolean;
  duration: number;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isInitializing: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanup = () => {
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setState({ isRecording: false, isInitializing: true, duration: 0, error: null });
    chunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setState(s => ({ ...s, duration: (Date.now() - startTimeRef.current) / 1000 }));
      }, 200);

      setState({ isRecording: true, isInitializing: false, duration: 0, error: null });
    } catch (err: any) {
      cleanup();
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access and try again.'
        : err?.message || 'Could not start recording.';
      setState({ isRecording: false, isInitializing: false, duration: 0, error: msg });
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanup();
        setState({ isRecording: false, isInitializing: false, duration: 0, error: null });
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setState({ isRecording: false, isInitializing: false, duration: 0, error: null });
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => { cleanup(); };
      recorder.stop();
    } else {
      cleanup();
    }
    setState({ isRecording: false, isInitializing: false, duration: 0, error: null });
  }, []);

  return { ...state, startRecording, stopRecording, cancelRecording };
}
