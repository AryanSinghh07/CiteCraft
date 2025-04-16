
import { useState, useEffect } from 'react';

export const usePageTransition = (isVisible: boolean = true) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) setShouldRender(true);
    else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match this to your animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return { 
    shouldRender, 
    animationClasses: isVisible 
      ? 'animate-fade-in' 
      : 'animate-fade-out'
  };
};

export const useFadeIn = (delay: number = 0) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return {
    style: {
      opacity: isVisible ? 1 : 0,
      transition: `opacity 500ms ease-in-out ${delay}ms`,
    }
  };
};

export const useBlurLoad = (ref: React.RefObject<HTMLImageElement>) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    
    if (ref.current.complete) {
      setIsLoaded(true);
    } else {
      ref.current.onload = () => {
        setIsLoaded(true);
      };
    }
  }, [ref]);

  return {
    isLoaded,
    blurClass: isLoaded ? 'blur-load loaded' : 'blur-load'
  };
};
