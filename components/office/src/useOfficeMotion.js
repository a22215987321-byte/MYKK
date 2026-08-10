import { useCallback, useEffect, useRef, useState } from "react";
import { buildAmbientSequence, IDLE_ACTIONS, initialActorState } from "./motionModel.js";

const MIN_MOVE_MS = 900;
const MAX_MOVE_MS = 3_200;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function travelTime(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return clamp(Math.round(distance * 88), MIN_MOVE_MS, MAX_MOVE_MS);
}

function visitPoint(visitor, host) {
  const approachFromLeft = visitor.homeX <= host.homeX;
  return {
    x: clamp(host.homeX + (approachFromLeft ? -7.2 : 7.2), 10, 90),
    y: clamp(host.homeY + 8.5, 12, 91),
  };
}

function routeBetween(from, to) {
  const usesLeftAisle = from.x < 28 || to.x < 28;
  const usesRightAisle = from.x > 70 || to.x > 70;
  const routeX = usesLeftAisle ? 28.5 : usesRightAisle ? 70.5 : 49.1;
  const fromLaneY = clamp(from.y, 45, 90);
  const toLaneY = clamp(to.y, 45, 90);
  return [
    { x: from.x, y: fromLaneY },
    { x: routeX, y: fromLaneY },
    { x: routeX, y: toLaneY },
    to,
  ].filter((point, index, points) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
}

function actionAllowsAgent(action, agent) {
  return Boolean(action && agent && action.actorId === agent.id);
}

export function useOfficeMotion(roster, paused) {
  const initial = () => Object.fromEntries(roster.map((agent) => [agent.id, initialActorState(agent)]));
  const [motions, setMotions] = useState(initial);
  const [sceneState, setSceneState] = useState({ doorOpen: false });
  const motionRef = useRef(initial());
  const queueRef = useRef([]);
  const busyRef = useRef(false);
  const pausedRef = useRef(paused);
  const stoppedRef = useRef(false);
  const runTokenRef = useRef(0);
  const timersRef = useRef(new Set());
  const pumpRef = useRef(null);

  const rawDelay = useCallback((duration) => new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      resolve();
    }, duration);
    timersRef.current.add(timer);
  }), []);

  const controlledWait = useCallback(async (duration, token) => {
    let elapsed = 0;
    while (elapsed < duration && !stoppedRef.current && runTokenRef.current === token) {
      if (pausedRef.current) {
        await rawDelay(80);
        continue;
      }
      const slice = Math.min(80, duration - elapsed);
      await rawDelay(slice);
      elapsed += slice;
    }
  }, [rawDelay]);

  const setMotion = useCallback((agentId, patch) => {
    const next = { ...motionRef.current[agentId], ...patch };
    motionRef.current = { ...motionRef.current, [agentId]: next };
    setMotions((current) => ({ ...current, [agentId]: next }));
  }, []);

  const runSequence = useCallback(async (agent, sequence, token) => {
    for (const step of sequence) {
      if (stoppedRef.current || runTokenRef.current !== token) return;
      const current = motionRef.current[agent.id];

      if (step.type === "wait") {
        await controlledWait(step.ms, token);
      } else if (step.type === "bubble") {
        setMotion(agent.id, { bubble: step.text });
      } else if (step.type === "clearBubble") {
        setMotion(agent.id, { bubble: "" });
      } else if (step.type === "status") {
        setMotion(agent.id, { state: step.state, emphasis: step.emphasis });
      } else if (step.type === "scale") {
        setMotion(agent.id, { scale: step.scale });
        await controlledWait(420, token);
      } else if (step.type === "fade") {
        setMotion(agent.id, { opacity: step.opacity });
        await controlledWait(900, token);
      } else if (step.type === "door") {
        setSceneState({ doorOpen: step.open });
        await controlledWait(420, token);
      } else if (step.type === "stand") {
        setMotion(agent.id, {
          pose: "standing",
          y: agent.homeY + 2.2,
          state: "checking",
          scale: 1,
          travelMs: 360,
          emphasis: true,
        });
        await controlledWait(440, token);
      } else if (step.type === "pose") {
        setMotion(agent.id, {
          pose: step.pose,
          y: step.y ?? current.y,
          scale: step.scale ?? 1,
          state: step.state ?? current.state,
          emphasis: step.emphasis ?? current.emphasis,
          sprite: step.pose === "drinking" ? agent.actionImages?.drinking || "/agent-actions/ivy-drinking.png" : "",
          travelMs: 360,
        });
        await controlledWait(440, token);
      } else if (step.type === "move") {
        const duration = travelTime(current, step);
        setMotion(agent.id, {
          x: step.x,
          y: step.y,
          pose: "walking",
          state: "walking",
          bubble: "",
          sprite: "",
          opacity: 1,
          facing: step.x < current.x ? -1 : 1,
          travelMs: duration,
          emphasis: true,
        });
        await controlledWait(duration + 40, token);
      } else if (step.type === "home") {
        const from = motionRef.current[agent.id];
        const destination = { x: agent.homeX, y: agent.homeY };
        const duration = travelTime(from, destination);
        if (from.x !== destination.x || from.y !== destination.y) {
          setMotion(agent.id, {
            ...destination,
            pose: "walking",
            state: "walking",
            bubble: "",
            sprite: "",
            opacity: 1,
            scale: 1,
            facing: destination.x < from.x ? -1 : 1,
            travelMs: duration,
          });
          await controlledWait(duration + 60, token);
        }
        setMotion(agent.id, { ...initialActorState(agent), state: step.finalState || "idle" });
        await controlledWait(560, token);
      }
    }
  }, [controlledWait, setMotion]);

  const runVisit = useCallback(async (mission, token) => {
    const visitor = roster.find((agent) => agent.id === mission.visitorId);
    const host = roster.find((agent) => agent.id === mission.hostId);
    if (!visitor || !host || visitor.id === host.id) return;
    const home = { x: visitor.homeX, y: visitor.homeY };
    const target = visitPoint(visitor, host);
    const outbound = routeBetween(home, target);
    const inbound = outbound.slice(0, -1).reverse();
    await runSequence(visitor, [
      { type: "stand" },
      ...outbound.map((point) => ({ type: "move", ...point })),
      { type: "pose", pose: "standing", state: "talking", emphasis: true },
      { type: "bubble", text: mission.message },
      { type: "wait", ms: 2400 },
      { type: "clearBubble" },
      ...inbound.map((point) => ({ type: "move", ...point })),
      { type: "home", finalState: mission.finalState || "idle" },
    ], token);
  }, [roster, runSequence]);

  const runAmbient = useCallback(async (mission, token) => {
    const agent = roster.find((item) => item.id === mission.agentId);
    if (!agent) return;
    await runSequence(agent, buildAmbientSequence(mission.actionId, agent), token);
  }, [roster, runSequence]);

  const pump = useCallback(() => {
    if (busyRef.current || pausedRef.current || stoppedRef.current) return;
    const mission = queueRef.current.shift();
    if (!mission) return;
    busyRef.current = true;
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    void (mission.kind === "visit" ? runVisit(mission, token) : runAmbient(mission, token)).finally(() => {
      if (runTokenRef.current === token) {
        busyRef.current = false;
        setSceneState({ doorOpen: false });
        pumpRef.current?.();
      }
    });
  }, [runAmbient, runVisit]);

  pumpRef.current = pump;

  const enqueueVisit = useCallback((visitorId, hostId, message, finalState = "idle") => {
    queueRef.current.unshift({ kind: "visit", visitorId, hostId, message, finalState });
    pumpRef.current?.();
  }, []);

  const enqueueIdleAction = useCallback((agentId, actionId) => {
    let agent = roster.find((item) => item.id === agentId);
    let action = IDLE_ACTIONS.find((item) => item.id === actionId);
    if (!action) {
      const available = IDLE_ACTIONS.filter((item) => !agent || actionAllowsAgent(item, agent));
      action = randomItem(available);
    }
    if (!agent && action) agent = roster.find((item) => item.id === action.actorId);
    if (!agent || !actionAllowsAgent(action, agent)) return null;
    queueRef.current.push({ kind: "ambient", agentId: agent.id, actionId: action.id });
    pumpRef.current?.();
    return { agentId: agent.id, actionId: action.id };
  }, [roster]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) pumpRef.current?.();
  }, [paused]);

  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
      runTokenRef.current += 1;
      busyRef.current = false;
      queueRef.current = [];
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return { motions, enqueueVisit, enqueueIdleAction, idleActions: IDLE_ACTIONS, sceneState };
}
