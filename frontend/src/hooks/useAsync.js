import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs an async fn on mount/deps change. Returns { data, error, loading, reload }. Stale responses are ignored. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(() => {
    const id = ++latest.current;
    setState(s => ({ ...s, error: null, loading: true }));
    Promise.resolve().then(() => fnRef.current())
      .then(data => { if (id === latest.current) setState({ data, error: null, loading: false }); })
      .catch(error => { if (id === latest.current) setState({ data: null, error, loading: false }); });
  }, []);
  useEffect(() => { run(); return () => { latest.current++; }; }, [run, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: run };
}
