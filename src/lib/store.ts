"use client";

import { useSyncExternalStore } from "react";
import type { Card, CardInput } from "./cards";

/**
 * Cards are saved in the browser's localStorage, so no database or account is needed.
 * Data stays in the browser it was entered in.
 */
const STORAGE_KEY = "cardvault:cards";
const EMPTY: Card[] = [];

let cache: Card[] | null = null;
const listeners = new Set<() => void>();

function read(): Card[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(cards: Card[]) {
  cache = cards;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep multiple open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** All saved cards. Returns an empty list during server rendering. */
export function useCards(): Card[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const noopSubscribe = () => () => {};
/** False during server rendering, true once running in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addCard(input: CardInput) {
  const now = new Date().toISOString();
  write([{ ...input, id: newId(), created_at: now, updated_at: now }, ...read()]);
}

export function updateCard(id: string, input: CardInput) {
  const now = new Date().toISOString();
  write(read().map((c) => (c.id === id ? { ...c, ...input, updated_at: now } : c)));
}

export function deleteCard(id: string) {
  write(read().filter((c) => c.id !== id));
}
