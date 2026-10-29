import { LoadingStatus } from "./activity";
export function VolleyRouteLoading() {
  return (
    <div className="volley-route-loading">
      <LoadingStatus />
      <div className="volley-skeleton" aria-hidden="true" />
      <div className="volley-skeleton" aria-hidden="true" />
      <div className="volley-skeleton" aria-hidden="true" />
    </div>
  );
}
