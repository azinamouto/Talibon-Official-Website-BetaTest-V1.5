import {Children, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent, type CSSProperties} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import styles from './MunicipalOffices.module.css';

const INTERVAL = 4500;

/** Only the visible copies participate in keyboard navigation and the accessibility tree. */
export default function OfficeSlideshow({children}: {children: ReactNode}) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const [reducedMotion, setReducedMotion] = useState(() => typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const viewport = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(4);
  const [position, setPosition] = useState(4);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const [animating, setAnimating] = useState(false);
  const moving = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{x: number; id: number} | null>(null);
  const dragged = useRef(false);
  const [cycle, setCycle] = useState(0);
  const cycleRef = useRef(0);
  const remaining = useRef(INTERVAL);
  const playing = count > 1 && !reducedMotion && !paused && !hovered && !focused && !hidden && !dragging;

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    clearTimeout(resetTimer.current);
    moving.current = false;
    setAnimating(false);
    setPosition(visible + currentRef.current);
  }, [reducedMotion, visible]);

  const go = useCallback((delta: number) => {
    if (moving.current || count < 2 || delta === 0) return;
    const next = (currentRef.current + delta + count) % count;
    currentRef.current = next;
    setCurrent(next);
    remaining.current = INTERVAL;
    cycleRef.current += 1;
    setCycle(cycleRef.current);
    if (reducedMotion) {
      setPosition(visible + next);
      return;
    }
    moving.current = true;
    setAnimating(true);
    setPosition(old => old + delta);
    // Rebase after the transition so the next step can loop in either direction.
    resetTimer.current = setTimeout(() => {
      setAnimating(false);
      setPosition(visible + next);
      moving.current = false;
    }, 400);
  }, [count, reducedMotion, visible]);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () => {
      const columns = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1;
      const width = element.clientWidth - 8; // The 4px inset leaves room for focus and shadows.
      const cardWidth = columns === 4 ? Math.min(292, (width - 48) / 4) : (width - (columns - 1) * 16) / columns;
      const gap = columns > 1 ? (width - cardWidth * columns) / (columns - 1) : 16;
      element.style.setProperty('--office-card-width', `${cardWidth}px`);
      element.style.setProperty('--office-gap', `${gap}px`);
      clearTimeout(resetTimer.current);
      moving.current = false;
      setAnimating(false);
      setVisible(columns);
      setPosition(columns + currentRef.current);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('resize', resize);
    return () => {observer.disconnect(); window.removeEventListener('resize', resize); clearTimeout(resetTimer.current);};
  }, []);

  useEffect(() => {
    const change = () => setHidden(document.hidden);
    change();
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const duration = remaining.current;
    const generation = cycleRef.current;
    const timer = setTimeout(() => go(1), duration);
    return () => {
      clearTimeout(timer);
      if (cycleRef.current === generation) remaining.current = Math.max(0, duration - (performance.now() - started));
    };
  }, [playing, cycle, go]);

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const distance = event.clientX - drag.current.x;
    drag.current = null;
    setDragging(false);
    setDragX(0);
    if (!cancelled && Math.abs(distance) > 40) go(distance < 0 ? 1 : -1);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div className={styles.slideshow} role="region" aria-roledescription="carousel" aria-label="Municipal offices slideshow"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);}}
    tabIndex={-1} onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if ((event.target as HTMLElement).closest('a')) event.currentTarget.focus();
        go(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}>
    <div ref={viewport} className={styles.viewport}
      onPointerDown={event => {if (event.button === 0 && event.isPrimary && !moving.current) {drag.current = {x:event.clientX,id:event.pointerId}; dragged.current = false; setDragging(true);}}}
      onPointerMove={event => {
        if (!drag.current || drag.current.id !== event.pointerId) return;
        const distance = event.clientX - drag.current.x;
        if (Math.abs(distance) > 10) {dragged.current = true; event.currentTarget.setPointerCapture(event.pointerId);}
        if (dragged.current) setDragX(Math.max(-120, Math.min(120, distance)));
      }}
      onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)}
      onDragStart={event => event.preventDefault()}
      onClickCapture={event => {if (dragged.current) {event.preventDefault(); event.stopPropagation(); dragged.current = false;}}}>
      <div className={`${styles.track} icon-float-group`} data-moving={animating && !reducedMotion}
        style={{transform:`translateX(calc(${position} * (var(--office-card-width) + var(--office-gap)) * -1 + ${reducedMotion ? 0 : dragX}px))`, transition:dragX ? 'none' : undefined}}>
        {Array.from({length:count + visible * 2},(_,index) => {
          const cardIndex = ((index - visible) % count + count) % count;
          const shown = index >= position && index < position + visible;
          return <div key={`${visible}-${index}`} className={styles.slide} role="group" aria-roledescription="slide"
            style={{'--float-delay': `${cardIndex * 0.6}s`} as CSSProperties}
            aria-label={`${cardIndex + 1} of ${count}`} aria-hidden={!shown} inert={!shown}>
            {cards[cardIndex]}
          </div>;
        })}
      </div>
    </div>
    <div className={styles.controls}>
      <button type="button" aria-label="Previous office" onClick={() => go(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
      <div className={styles.dots} role="group" aria-label="Choose starting office">
        {cards.map((_,index) => <button type="button" key={index} aria-label={`Start with office ${index + 1}`}
          aria-current={current === index ? 'true' : undefined} onClick={() => go(index - current)}><span /></button>)}
      </div>
      <button type="button" aria-label="Next office" onClick={() => go(1)}><ArrowRight size={20} aria-hidden="true" /></button>
      <button type="button" disabled={!!reducedMotion} title={reducedMotion ? 'Autoplay is disabled by your reduced-motion preference' : undefined}
        aria-label={paused || reducedMotion ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? 'Play' : 'Pause'}</button>
    </div>
    <div className={styles.progress} aria-hidden="true"><span key={cycle} style={{animationPlayState:playing ? 'running' : 'paused',animationName:reducedMotion ? 'none' : undefined}} /></div>
    <p className="sr-only" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">Starting with office {current + 1} of {count}. Showing {Math.min(visible,count)} offices.</p>
  </div>;
}
