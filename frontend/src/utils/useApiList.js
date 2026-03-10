import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../utils/apiClient";

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function getLastPage(payload) {
  const meta = payload?.meta || payload || {};
  const lp = Number(meta?.last_page ?? meta?.lastPage ?? 1);
  return Number.isFinite(lp) && lp > 0 ? lp : 1;
}

export function useApiList(
  path,
  {
    authed = true,
    allPages = false,
    perPage = 10,
    params = null,
    pageParam = "page",
    perPageParam = "per_page",
  } = {}
) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const paramsStable = useMemo(() => {
    const obj = params && typeof params === "object" ? params : {};
    return JSON.stringify(obj);
  }, [params]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const baseParams =
        params && typeof params === "object" ? params : {};

      const fetchPage = async (page) => {
        const client = authed
          ? api
          : api.create
            ? api.create()
            : null;

        if (client && client !== api) {
          client.defaults.baseURL = api.defaults.baseURL;
          client.defaults.withCredentials = true;
        }

        const res = await (authed ? api : client).get(path, {
          params: {
            ...baseParams,
            [perPageParam]: perPage,
            [pageParam]: page,
          },
        });
        return res.data;
      };

      if (!allPages) {
        const payload = await fetchPage(1);
        const dataRows = extractRows(payload);
        setRows(dataRows);
        return dataRows;
      }

      const firstPayload = await fetchPage(1);
      const lastPage = getLastPage(firstPayload);

      let merged = [...extractRows(firstPayload)];

      if (lastPage > 1) {
        const promises = [];
        for (let p = 2; p <= lastPage; p++) promises.push(fetchPage(p));
        const rest = await Promise.all(promises);
        for (const payload of rest) merged.push(...extractRows(payload));
      }

      setRows(merged);
      return merged;
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || "Failed to load.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [
    path,
    authed,
    allPages,
    perPage,
    pageParam,
    perPageParam,
    paramsStable,
  ]);

  useEffect(() => {
    load();
  }, [load]);`1 `

  return { rows, loading, error, reload: load, setRows };
}