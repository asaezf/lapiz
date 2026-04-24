"use client";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Round, AnswerEntry } from "@/game/types";

export interface PlayerAnswersDoc {
  id: string; // playerId
  words: Record<number, AnswerEntry>;
}

export function useRound(code: string, roundIdx: number | null) {
  const [round, setRound] = useState<Round | null>(null);
  const [answers, setAnswers] = useState<PlayerAnswersDoc[]>([]);

  useEffect(() => {
    if (!code || roundIdx == null) return;
    const rRef = doc(db, "rooms", code, "rounds", `round_${roundIdx}`);
    const unsub1 = onSnapshot(rRef, (s) => setRound(s.exists() ? (s.data() as Round) : null));
    const aCol = collection(db, "rooms", code, "rounds", `round_${roundIdx}`, "answers");
    const unsub2 = onSnapshot(aCol, (snap) => {
      setAnswers(snap.docs.map((d) => ({ id: d.id, words: (d.data() as any).words || {} })));
    });
    return () => { unsub1(); unsub2(); };
  }, [code, roundIdx]);

  return { round, answers };
}
