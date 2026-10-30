"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, CheckCircle2, CircleAlert, X } from "lucide-react";
import "./activity.css";
type Activity = {
  id: string;
  kind: "loading" | "success" | "error";
  message: string;
};
type Report = Activity | { id: string; kind: "clear" };
const Context = createContext<(activity: Report) => void>(() => {});
export function ActivityProvider({ children }: { children: ReactNode }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const report = useCallback((next: Report) => {
    if (next.kind === "clear") {
      setActivity((current) =>
        current?.id === next.id && current.kind === "loading" ? null : current,
      );
      return;
    }
    if (timeout.current) clearTimeout(timeout.current);
    setActivity((current) =>
      current?.kind === "loading" &&
      current.id !== next.id &&
      next.kind !== "loading"
        ? current
        : next,
    );
    if (next.kind === "success")
      timeout.current = setTimeout(
        () =>
          setActivity((current) => (current?.id === next.id ? null : current)),
        3500,
      );
  }, []);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  return (
    <Context.Provider value={report}>
      {children}
      {activity && (
        <div
          className={`volley-operation volley-operation-${activity.kind}`}
          role={activity.kind === "error" ? "alert" : "status"}
          aria-live={activity.kind === "error" ? "assertive" : "polite"}
        >
          {activity.kind === "loading" ? (
            <LoaderCircle className="volley-spin" aria-hidden="true" />
          ) : activity.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
          <span>{activity.message}</span>
          {activity.kind !== "loading" && (
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setActivity(null)}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </Context.Provider>
  );
}
export function useOperationStatus(
  pending: boolean,
  message = "Salvando alterações…",
  error = "",
  success = "",
) {
  const report = useContext(Context),
    id = useId();
  useEffect(() => {
    if (pending) report({ id, kind: "loading", message });
    else if (error) report({ id, kind: "error", message: error });
    else if (success) report({ id, kind: "success", message: success });
    else report({ id, kind: "clear" });
  }, [pending, message, error, success, report, id]);
  useEffect(() => () => report({ id, kind: "clear" }), [report, id]);
}
export function LoadingStatus({
  message = "Consultando informações…",
}: {
  message?: string;
}) {
  return (
    <div
      className="volley-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle className="volley-spin" aria-hidden="true" />
      <div>
        <strong>{message}</strong>
        <p>Aguarde um instante.</p>
      </div>
    </div>
  );
}
