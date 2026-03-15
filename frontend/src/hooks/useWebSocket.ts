import { useRef, useState, useCallback, useEffect } from "react";
import type { WsMessage } from "../lib/types";

type AgentStatus = Record<string, "pending" | "running" | "complete">;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({});
  const [lastResult, setLastResult] = useState<Extract<WsMessage, { type: "result" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);

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

  const sendQuery = useCallback((question: string, sessionKey?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    setAgentStatus({});
    const msg: WsMessage = { type: "query", question, session_key: sessionKey };
    wsRef.current.send(JSON.stringify(msg));
  }, []);

  return { connected, agentStatus, lastResult, error, loading, sendQuery };
}
