"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { parseAmountInput } from "@/lib/amount";
import { VOICE_STEP_ORDER } from "@/lib/constants";
import type { VoiceStep } from "@/lib/types";

const GROUP_SKIP_TERMS = new Set(["건너뛰기", "건너뛰기요", "미분류", "없음", "없어요", "없어", "패스", "skip"]);

type VoiceValues = {
  amount: string;
  group: string;
  name: string;
};

type UseVoiceInputOptions = {
  onCaptured: (step: VoiceStep, transcript: string) => void;
  onStepResolved: (nextStep: VoiceStep | null) => void;
  values: VoiceValues;
};

export function useVoiceInput({ onCaptured, onStepResolved, values }: UseVoiceInputOptions) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const draftRef = useRef<VoiceValues>(values);
  const activeStepRef = useRef<VoiceStep | null>(null);
  const restartRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeStep, setActiveStep] = useState<VoiceStep | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    draftRef.current = values;
  }, [values]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(Boolean(Recognition));

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const getNextStep = (currentValues: VoiceValues, fromStep?: VoiceStep | null) => {
    const startIndex = fromStep ? VOICE_STEP_ORDER.indexOf(fromStep) + 1 : 0;

    for (let index = startIndex; index < VOICE_STEP_ORDER.length; index += 1) {
      const step = VOICE_STEP_ORDER[index];
      const value = currentValues[step];

      if (step === "group") {
        if (!value.trim()) {
          if (parseAmountInput(currentValues.amount)) {
            continue;
          }

          return step;
        }

        continue;
      }

      if (step === "amount") {
        if (!parseAmountInput(value)) {
          return step;
        }
        continue;
      }

      if (!value.trim()) {
        return step;
      }
    }

    return null;
  };

  const getStartStep = (currentValues: VoiceValues, preferredStep?: VoiceStep) => {
    if (preferredStep === "name" && !currentValues.name.trim()) {
      return "name";
    }

    if (preferredStep === "group" && !currentValues.group.trim()) {
      return "group";
    }

    if (preferredStep === "amount" && !parseAmountInput(currentValues.amount)) {
      return "amount";
    }

    return getNextStep(currentValues, null);
  };

  const normalizeGroupTranscript = (transcript: string) => {
    const normalized = transcript.replace(/\s+/g, "").toLowerCase();
    return GROUP_SKIP_TERMS.has(normalized) ? "" : transcript.trim();
  };

  const stop = () => {
    restartRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setActiveStep(null);
    activeStepRef.current = null;
  };

  const beginListening = (step: VoiceStep) => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setErrorText("이 브라우저는 음성 입력을 지원하지 않습니다.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setErrorText(null);
      setIsListening(true);
      setActiveStep(step);
      activeStepRef.current = step;
    };

    recognition.onerror = () => {
      restartRef.current = false;
      setIsListening(false);
      setActiveStep(null);
      activeStepRef.current = null;
      setErrorText("음성을 인식하지 못했어요. 필요한 칸부터 다시 시작해 주세요.");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!activeStepRef.current || !transcript) {
        return;
      }

      const currentStep = activeStepRef.current;
      const resolvedTranscript = currentStep === "group" ? normalizeGroupTranscript(transcript) : transcript;

      onCaptured(currentStep, resolvedTranscript);

      const nextValues = {
        ...draftRef.current,
        [currentStep]: resolvedTranscript,
      };

      if (currentStep === "amount" && parseAmountInput(resolvedTranscript)) {
        nextValues.amount = resolvedTranscript;
      }

      draftRef.current = nextValues;

      const nextStep = getNextStep(nextValues, currentStep);
      restartRef.current = Boolean(nextStep);
      onStepResolved(nextStep);
      activeStepRef.current = nextStep;
      setActiveStep(nextStep);
    };

    recognition.onend = () => {
      const nextStep = activeStepRef.current;

      if (restartRef.current && nextStep) {
        restartRef.current = false;
        beginListening(nextStep);
        return;
      }

      setIsListening(false);
      if (!nextStep) {
        setActiveStep(null);
      }
      activeStepRef.current = nextStep;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const start = (preferredStep?: VoiceStep) => {
    const nextStep = getStartStep(draftRef.current, preferredStep);

    if (!nextStep) {
      setErrorText("이름, 그룹, 금액이 이미 채워져 있어 메모 입력으로 넘어갈 수 있어요.");
      onStepResolved(null);
      return;
    }

    beginListening(nextStep);
  };

  const statusText = useMemo(() => {
    if (!isSupported) {
      return "이 브라우저는 음성 입력을 지원하지 않습니다.";
    }

    if (errorText) {
      return errorText;
    }

    if (!activeStep) {
      return "이름 → 그룹 → 금액 순서로 비어 있는 칸부터 이어서 입력합니다. 그룹은 건너뛸 수 있어요.";
    }

    const messageMap: Record<VoiceStep, string> = {
      amount: "금액을 말해 주세요. 예: 십오만, 10만, 1만 5천",
      group: "그룹을 말해 주세요. 비워 두려면 '건너뛰기'라고 말해 주세요.",
      name: "이름을 말해 주세요.",
    };

    return messageMap[activeStep];
  }, [activeStep, errorText, isSupported]);

  return {
    isListening,
    isSupported,
    start,
    statusText,
    stop,
  };
}
