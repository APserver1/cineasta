import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ConceptMap from './ConceptMap';
import { Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ADSTERRA_NATIVE_CONTAINER_ID = 'container-20a02c2e254f8f71908f748a0dc22c3d';
const ADSTERRA_NATIVE_SCRIPT_SRC = 'https://pl28698636.effectivegatecpm.com/20a02c2e254f8f71908f748a0dc22c3d/invoke.js';

const EscaletaTab = ({ project, onUpdateProject, readOnly = false }) => {
  const [scenes, setScenes] = useState([]);
  const [saving, setSaving] = useState(false);
  const isFirstLoad = useRef(true);

  // Load initial data
  useEffect(() => {
    // Only set scenes from project if it's the first load or if scenes is empty
    // This prevents overwriting local state if project prop updates but we have unsaved changes
    if (isFirstLoad.current) {
        if (project?.escaleta_data && project.escaleta_data.length > 0) {
            setScenes(project.escaleta_data);
        } else {
            // Initialize with one empty scene if none exists
            setScenes([{ id: Date.now(), number: 1, description: '' }]);
        }
        isFirstLoad.current = false;
    }
  }, [project]);

  // Auto-save debouncer
  useEffect(() => {
    if (isFirstLoad.current) return; // Don't save on initial load

    const timer = setTimeout(() => {
      if (project && !readOnly) {
        saveData();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [scenes]);

  const saveData = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('proyectos_cineasta')
        .update({ escaleta_data: scenes })
        .eq('id', project.id);

      if (error) throw error;
      
      // Notify parent to update local state
      if (onUpdateProject) {
          onUpdateProject({ escaleta_data: scenes });
      }

    } catch (error) {
      console.error('Error saving escaleta data:', error);
    } finally {
      setSaving(false);
    }
  };

  const addScene = (index = null) => {
    if (readOnly) return;
    const newScene = {
      id: Date.now(),
      number: 0, // Placeholder, will be recalculated
      description: ''
    };

    let newScenes = [];
    if (index !== null) {
        // Insert at specific index (after the current scene)
        newScenes = [
            ...scenes.slice(0, index + 1),
            newScene,
            ...scenes.slice(index + 1)
        ];
    } else {
        // Append to end
        newScenes = [...scenes, newScene];
    }

    // Re-number all scenes
    const reorderedScenes = newScenes.map((scene, idx) => ({
        ...scene,
        number: idx + 1
    }));

    setScenes(reorderedScenes);
  };

  const updateScene = (id, newDescription) => {
    if (readOnly) return;
    setScenes(scenes.map(scene => 
      scene.id === id ? { ...scene, description: newDescription } : scene
    ));
  };

  const deleteScene = (id) => {
      if (readOnly) return;
      const newScenes = scenes.filter(s => s.id !== id);
      // Re-number scenes
      const reorderedScenes = newScenes.map((scene, index) => ({
          ...scene,
          number: index + 1
      }));
      setScenes(reorderedScenes);
  };

  const scrollRef = useRef(null);

  // Restore scroll position
  useEffect(() => {
      if (project?.last_state?.escaletaScroll && scrollRef.current) {
          scrollRef.current.scrollTop = project.last_state.escaletaScroll;
      }
  }, [project?.last_state]);

  const handleScroll = (e) => {
      if (readOnly) return;
      if (onUpdateProject) {
          const newLastState = {
              ...(project.last_state || {}),
              escaletaScroll: e.target.scrollTop
          };
          
          // Debounce this update in parent or just update local state object for now
          // We don't want to save to DB on every scroll event
          // But we need to update the parent state so if user switches tabs and comes back it persists
          // Actually, Editor.jsx handles saving to DB on tab switch.
          // We just need to update the parent state object in memory.
          onUpdateProject({ last_state: newLastState });
      }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 min-h-0">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          data-pins-surface="escaleta"
          data-pins-type="scroll"
          className="w-1/2 min-h-0 overflow-y-auto bg-gray-50 p-8 border-r border-gray-200"
        >
          <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Escaleta</h2>
                  {saving && <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>}
              </div>

              <div className="space-y-6">
                  <AnimatePresence>
                      {scenes.map((scene, index) => (
                          <motion.div 
                              key={scene.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="relative"
                          >
                              <div className="flex flex-col group/scene">
                                  <div className="flex items-center">
                                      <div className="bg-white border-2 border-black border-b-0 px-4 py-1 font-bold text-sm tracking-wide uppercase select-none min-w-[120px] text-center rounded-t-lg z-10 relative top-[2px]">
                                          ESCENA {scene.number}
                                      </div>
                                      <div className="flex-1 border-b-2 border-black h-[2px] relative top-[1px]"></div>
                                  </div>
                                  
                                  <div className="bg-white border-2 border-black p-4 shadow-sm min-h-[120px] relative transition-shadow hover:shadow-md">
                                      <textarea 
                                          value={scene.description}
                                          onChange={(e) => {
                                              updateScene(scene.id, e.target.value);
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                          }}
                                          onFocus={(e) => {
                                              e.target.style.height = 'auto';
                                              e.target.style.height = e.target.scrollHeight + 'px';
                                          }}
                                          readOnly={readOnly}
                                          className="w-full h-full min-h-[100px] resize-none outline-none text-gray-700 bg-transparent text-lg leading-relaxed overflow-hidden"
                                          placeholder="Describe lo que sucede en esta escena..."
                                      />
                                      
                                      <button 
                                          onClick={() => deleteScene(scene.id)}
                                          disabled={readOnly}
                                          className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover/scene:opacity-100"
                                          title="Eliminar escena"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>

                                  <div className="h-6 w-full flex items-center justify-center cursor-pointer group/insert py-4 z-20 mt-2"
                                       onClick={() => addScene(index)}
                                  >
                                      <div className="w-full h-[1px] bg-gray-200 group-hover/insert:bg-purple-400 transition-colors"></div>
                                      <div className="absolute bg-white border border-gray-200 group-hover/insert:border-purple-400 text-gray-400 group-hover/insert:text-purple-600 rounded-full p-1 shadow-sm transition-all transform group-hover/insert:scale-110">
                                          <Plus size={16} />
                                      </div>
                                  </div>
                              </div>
                          </motion.div>
                      ))}
                  </AnimatePresence>

                  <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addScene}
                      disabled={readOnly}
                      className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                  >
                      <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                              <Plus size={24} />
                          </div>
                          <span className="font-medium">Añadir Escena</span>
                      </div>
                  </motion.button>
              </div>
          </div>
        </div>

        <div className="w-1/2 min-h-0 bg-gray-100 relative">
          <div className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-gray-500 border border-gray-200 shadow-sm">
              Vista de Referencia
          </div>
          <ConceptMap 
            formData={project.concepto_data || {}} 
            projectTitle={project.title} 
            readOnly={true}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white">
        <div className="h-[120px] w-full flex items-center justify-center overflow-hidden" data-adsterra-slot="escaleta-inferior">
          <AdsterraNativeBanner containerId={ADSTERRA_NATIVE_CONTAINER_ID} scriptSrc={ADSTERRA_NATIVE_SCRIPT_SRC} />
        </div>
      </div>
    </div>
  );
};

const AdsterraNativeBanner = ({ containerId, scriptSrc }) => {
  const mountRef = useRef(null);
  const containerRef = useRef(null);
  const clonesRef = useRef(null);
  const wrapperRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const requestReload = () => setRefreshKey((prev) => prev + 1);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestReload();
      }
    };
    const handleFocus = () => requestReload();
    const handlePageShow = () => requestReload();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    host.replaceChildren();
    wrapperRef.current = null;
    containerRef.current = null;
    clonesRef.current = null;

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapperRef.current = wrapper;
    host.appendChild(wrapper);

    const container = document.createElement('div');
    container.id = containerId;
    container.style.width = '100%';
    containerRef.current = container;
    wrapper.appendChild(container);

    const clonesHost = document.createElement('div');
    clonesHost.style.width = '100%';
    clonesRef.current = clonesHost;
    wrapper.appendChild(clonesHost);

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    const cacheBuster = `v=${Date.now()}`;
    script.src = scriptSrc.includes('?') ? `${scriptSrc}&${cacheBuster}` : `${scriptSrc}?${cacheBuster}`;
    wrapper.appendChild(script);

    const applyScale = () => {
      if (!wrapperRef.current || !containerRef.current || !mountRef.current) return;
      const contentHeight =
        containerRef.current.scrollHeight || containerRef.current.offsetHeight;
      if (!contentHeight) return;
      const hostHeight = mountRef.current.clientHeight || 0;
      if (!hostHeight) return;
      const scale = Math.min(1, hostHeight / contentHeight);
      wrapperRef.current.style.transform = `scale(${scale})`;
      wrapperRef.current.style.transformOrigin = 'top left';
      wrapperRef.current.style.width = `${100 / scale}%`;
    };

    const updateClones = () => {
      if (!containerRef.current || !clonesRef.current || !mountRef.current) return;
      const html = containerRef.current.innerHTML;
      if (!html) {
        clonesRef.current.replaceChildren();
        return;
      }
      const contentHeight =
        containerRef.current.scrollHeight || containerRef.current.offsetHeight || 1;
      const hostHeight = mountRef.current.clientHeight || 0;
      if (!hostHeight) return;
      const scale = Math.min(1, hostHeight / contentHeight);
      const effectiveRowHeight = contentHeight * scale;
      const clonesNeeded = Math.max(0, Math.ceil(hostHeight / effectiveRowHeight) - 1);
      clonesRef.current.replaceChildren();
      for (let i = 0; i < clonesNeeded; i += 1) {
        const clone = document.createElement('div');
        clone.innerHTML = html;
        clonesRef.current.appendChild(clone);
      }
    };

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        applyScale();
        updateClones();
      });
    });

    observer.observe(container, { childList: true, subtree: true });
    requestAnimationFrame(() => {
      applyScale();
      updateClones();
    });

    return () => {
      observer.disconnect();
    };
  }, [containerId, scriptSrc, refreshKey]);

  return <div ref={mountRef} className="w-full h-full flex flex-col items-start justify-start overflow-hidden" />;
};

export default EscaletaTab;
