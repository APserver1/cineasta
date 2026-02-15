import { useEffect, useRef, useState } from 'react';

const ADSTERRA_NATIVE_CONTAINER_ID = 'container-20a02c2e254f8f71908f748a0dc22c3d';
const ADSTERRA_NATIVE_SCRIPT_SRC = 'https://pl28698636.effectivegatecpm.com/20a02c2e254f8f71908f748a0dc22c3d/invoke.js';

const EditorAdBanner = ({ height = 120 }) => {
  const mountRef = useRef(null);
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const lastReloadAtRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimersRef = useRef([]);

  useEffect(() => {
    const requestReload = () => {
      const now = Date.now();
      if (now - lastReloadAtRef.current < 250) return;
      lastReloadAtRef.current = now;
      retryCountRef.current = 0;
      setRefreshKey((prev) => prev + 1);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestReload();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', requestReload);
    window.addEventListener('blur', requestReload);
    window.addEventListener('pageshow', requestReload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', requestReload);
      window.removeEventListener('blur', requestReload);
      window.removeEventListener('pageshow', requestReload);
    };
  }, []);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    retryTimersRef.current.forEach((t) => clearTimeout(t));
    retryTimersRef.current = [];

    host.replaceChildren();
    wrapperRef.current = null;
    containerRef.current = null;

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapperRef.current = wrapper;
    host.appendChild(wrapper);

    const container = document.createElement('div');
    container.id = ADSTERRA_NATIVE_CONTAINER_ID;
    container.style.width = '100%';
    containerRef.current = container;
    wrapper.appendChild(container);

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    const cacheBuster = `v=${Date.now()}-${refreshKey}`;
    script.src = ADSTERRA_NATIVE_SCRIPT_SRC.includes('?')
      ? `${ADSTERRA_NATIVE_SCRIPT_SRC}&${cacheBuster}`
      : `${ADSTERRA_NATIVE_SCRIPT_SRC}?${cacheBuster}`;
    wrapper.appendChild(script);

    const applyScale = () => {
      const curHost = mountRef.current;
      const curWrapper = wrapperRef.current;
      const curContainer = containerRef.current;
      if (!curHost || !curWrapper || !curContainer) return;
      const hostHeight = curHost.clientHeight || 0;
      const contentHeight = curContainer.scrollHeight || curContainer.offsetHeight || 0;
      if (!hostHeight || !contentHeight) return;
      const scale = Math.min(1, hostHeight / contentHeight);
      curWrapper.style.transform = `scale(${scale})`;
      curWrapper.style.transformOrigin = 'top left';
      curWrapper.style.width = `${100 / scale}%`;
    };

    const observer = new MutationObserver(() => {
      requestAnimationFrame(applyScale);
    });

    observer.observe(container, { childList: true, subtree: true });
    window.addEventListener('resize', applyScale);
    requestAnimationFrame(applyScale);

    const isRenderable = () => {
      const cur = containerRef.current;
      if (!cur) return false;
      if (cur.childElementCount > 0) return true;
      if (cur.innerHTML && cur.innerHTML.trim().length > 0) return true;
      return false;
    };

    const scheduleRetry = () => {
      if (retryCountRef.current >= 3) return;
      if (isRenderable()) return;
      retryCountRef.current += 1;
      setRefreshKey((prev) => prev + 1);
    };

    retryTimersRef.current.push(setTimeout(scheduleRetry, 600));
    retryTimersRef.current.push(setTimeout(scheduleRetry, 1800));

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applyScale);
      retryTimersRef.current.forEach((t) => clearTimeout(t));
      retryTimersRef.current = [];
    };
  }, [refreshKey]);

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white">
      <div className="w-full overflow-hidden" style={{ height }} ref={mountRef} />
    </div>
  );
};

export default EditorAdBanner;
