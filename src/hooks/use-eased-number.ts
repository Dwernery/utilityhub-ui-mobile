import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Returns `target`, but when it changes, tweens there over `duration` ms (ease-out) by re-rendering
 * each frame. Meant for small JS-drawn visuals (e.g. an SVG chart's height) that can't use native
 * layout animations. The first value applies immediately; with Reduce Motion (or `duration` 0)
 * every change is instant.
 */
export function useEasedNumber(target: number, duration = 250) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const valueRef = useRef(target);
  const first = useRef(true);

  useEffect(() => {
    if (first.current || reduceMotion || duration <= 0) {
      first.current = false;
      valueRef.current = target;
      setValue(target);
      return;
    }
    fromRef.current = valueRef.current;
    const start = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const v = fromRef.current + (target - fromRef.current) * easeOut(t);
      valueRef.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduceMotion]);

  return value;
}
