"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Room, Player } from "@/game/types";

export function useRoom(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Array<Player & { id: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const roomRef = doc(db, "rooms", code);
    const unsub1 = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) setError("Sala no encontrada");
        else setRoom(snap.data() as Room);
      },
      (err) => setError(err.message)
    );
    const playersQ = query(collection(db, "rooms", code, "players"), orderBy("joinedAt", "asc"));
    const unsub2 = onSnapshot(playersQ, (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Player) })));
    });
    return () => { unsub1(); unsub2(); };
  }, [code]);

  return { room, players, error };
}
