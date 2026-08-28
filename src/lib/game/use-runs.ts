"use client";

import { useSyncExternalStore } from "react";
import {
  runsSnapshot,
  serverRunsSnapshot,
  subscribeToRuns,
} from "./storage";
import type { RunRecord } from "./types";

/** The local run history, kept in sync across every component that reads it. */
export function useRuns(): RunRecord[] {
  return useSyncExternalStore(
    subscribeToRuns,
    runsSnapshot,
    serverRunsSnapshot,
  );
}
