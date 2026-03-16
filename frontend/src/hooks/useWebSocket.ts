import { useRef, useState, useCallback, useEffect } from "react";
import type { WsMessage } from "../lib/types";

type AgentStatus = Record<string, "pending" | "running" | "complete">;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [lastResult, setLastResult] = useState<Extract<WsMessage, { type: "result" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      setConnected(true);
      retriesRef.current = 0;
    };
    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;
      setTimeout(connect, delay);
    };

    ws.onmessage = (event) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "status") {
        setAgentStatus((prev) => ({ ...prev, [msg.agent]: msg.state }));
      } else if (msg.type === "result") {
        setLastResult(msg);
        setLoading(false);
        setAgentStatus({});
      } else if (msg.type === "error") {
        setError(msg.message);
        setLoading(false);
        setAgentStatus({});
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const sendQuery = useCallback((question: string, sessionKey?: string, isHistorical?: boolean, history?: { role: string; content: string }[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    setAgentStatus({});
    const msg: WsMessage = { type: "query", question, session_key: sessionKey, is_historical: isHistorical, history };
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  return { connected, agentStatus, lastResult, error, loading, sendQuery };
}
