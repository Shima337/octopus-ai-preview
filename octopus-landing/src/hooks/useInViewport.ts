import { useEffect, useRef, useState, type RefObject } from 'react';

export function useInViewport<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null!);
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInViewport(entry.isIntersecting),
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isInViewport];
}
