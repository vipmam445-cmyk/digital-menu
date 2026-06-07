'use client';

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { AlertTriangle, Loader2, Smartphone, RefreshCw } from 'lucide-react';

interface ARViewProps {
  glbSrc: string;
  usdzSrc: string;
  poster?: string;
  alt: string;
}

export const ARView: React.FC<ARViewProps> = memo(({ glbSrc, usdzSrc, poster, alt }) => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modelViewerReady, setModelViewerReady] = useState(false);
  const modelRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCount = useRef(0);

  // Platform detection
  useEffect(() => {
    setIsClient(true);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(ios);
    setIsAndroid(android);
    if (!ios && !android) {
      fetch(glbSrc, { cache: 'force-cache' }).catch(() => {});
    }
  }, [glbSrc]);

  // model-viewer registration (desktop only)
  useEffect(() => {
    if (isIOS || isAndroid || !isClient) return;
    let mounted = true;
    const check = () => {
      if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) {
        if (mounted) setModelViewerReady(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const interval = setInterval(() => { if (check()) clearInterval(interval); }, 200);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (mounted) { setState('error'); setErrorMsg('3D viewer failed to load.'); }
    }, 10000);
    return () => { mounted = false; clearInterval(interval); clearTimeout(timeout); };
  }, [isClient, isIOS, isAndroid]);

  // Model load progress & events (desktop only)
  useEffect(() => {
    if (isIOS || isAndroid || !modelViewerReady || !modelRef.current) return;
    const mv = modelRef.current;
    let mounted = true;
    const onProgress = (e: any) => {
      if (mounted && e.detail && typeof e.detail.totalProgress === 'number') {
        setProgress(Math.round(e.detail.totalProgress * 100));
      }
    };
    const onLoad = () => { if (mounted) { setState('ready'); setProgress(100); } };
    const onError = () => { if (mounted) { setState('error'); setErrorMsg('Failed to load 3D model.'); } };
    mv.addEventListener('progress', onProgress);
    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    if (mv.loaded) { setState('ready'); setProgress(100); }
    return () => { mounted = false; mv.removeEventListener('progress', onProgress); mv.removeEventListener('load', onLoad); mv.removeEventListener('error', onError); };
  }, [modelViewerReady, glbSrc, isIOS, isAndroid]);

  const handleRetry = useCallback(() => {
    retryCount.current += 1;
    setState('loading'); setProgress(0); setErrorMsg(null);
  }, []);

  const absoluteUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return window.location.origin + path;
  };

  if (!isClient) return null;

  const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absoluteUrl(glbSrc))}&mode=ar_only`;

  const isMobile = isIOS || isAndroid;

  return (
    <div>
      {/* 3D Display Area — no overlay buttons (avoids duplication) */}
      <div ref={containerRef} className="relative w-full h-[400px] md:h-[450px] bg-cream-dark rounded-xl overflow-hidden shadow-inner">
        {isMobile ? (
          // Mobile: show poster as preview (no AR button overlay — button is below)
          <>
            {poster ? (
              <img src={poster} alt={alt} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Smartphone size={48} className="text-gold/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none">
              <p className="text-xs text-white font-bold tracking-wider uppercase">3D Preview</p>
            </div>
          </>
        ) : (
          // Desktop: model-viewer with loading/error
          <>
            {state === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-dark z-10 px-6">
                <Loader2 className="w-10 h-10 text-gold animate-spin mb-3" />
                <p className="text-sm text-muted font-medium">Loading 3D Model...</p>
                {progress > 0 && (
                  <div className="w-full max-w-[200px] mt-3">
                    <div className="h-1.5 bg-border-warm rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted/40 mt-1 text-center">{progress}%</p>
                  </div>
                )}
              </div>
            )}
            {state === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream-dark p-6 text-center z-20">
                <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-base text-black font-semibold">{errorMsg || 'Failed to load 3D model'}</p>
                <button onClick={handleRetry} className="mt-4 px-6 py-2.5 bg-gold text-white rounded-full text-sm font-bold hover:bg-brown-dark transition-colors flex items-center gap-2">
                  <RefreshCw size={16} /> Try Again
                </button>
              </div>
            ) : (
              <>
                {modelViewerReady && (
                  <model-viewer
                    key={`${glbSrc}-${retryCount.current}`}
                    ref={modelRef}
                    src={glbSrc}
                    ios-src={usdzSrc}
                    poster={poster}
                    alt={alt}
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    ar-placement="floor"
                    camera-controls
                    auto-rotate
                    shadow-intensity="1"
                    exposure="1"
                    reveal="auto"
                    loading="lazy"
                    touch-action="pan-y"
                    style={{ width: '100%', height: '100%', display: 'block', minHeight: '400px' }}
                  >
                    <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none">
                      <p className="text-xs text-white font-bold tracking-wider uppercase">3D Preview</p>
                    </div>
                  </model-viewer>
                )}
                {!modelViewerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cream-dark">
                    <div className="text-center px-6">
                      <Smartphone size={48} className="text-gold/30 mx-auto mb-3" />
                      <p className="text-sm text-muted font-medium mb-1">Loading 3D viewer...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* View in AR — single button, no duplicates */}
      <div className="mt-3 text-center">
        {isIOS ? (
          <a href={absoluteUrl(usdzSrc)} rel="ar" className="inline-flex items-center gap-2 bg-gold text-white px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-xl hover:bg-brown-dark transition-all active:scale-[0.97]">
            <Smartphone size={18} /> View in AR
          </a>
        ) : (
          <a href={sceneViewerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gold text-white px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-xl hover:bg-brown-dark transition-all active:scale-[0.97]">
            <Smartphone size={18} /> View in AR
          </a>
        )}
        <p className="text-[10px] text-muted/40 text-center mt-2 leading-relaxed">Point your camera at a flat surface to see the food in real size</p>
      </div>
    </div>
  );
});

ARView.displayName = 'ARView';
