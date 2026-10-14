"use client";
import { useStore } from "./store";
export default function Toast() {
  const { toast } = useStore();
  return <div className="toast" role="status" hidden={!toast}>{toast}</div>;
}
