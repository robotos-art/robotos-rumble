import gsap from "gsap";

// Page transition animations
export const pageTransition = {
  in: (element: HTMLElement) => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
    );
  },
  out: (element: HTMLElement) => {
    return gsap.to(element, {
      opacity: 0,
      y: -20,
      duration: 0.4,
      ease: "power2.in",
    });
  },
};

// Card animations
export const cardAnimations = {
  hover: (element: HTMLElement) => {
    gsap.to(element, {
      scale: 1.02,
      duration: 0.2,
      ease: "power2.out",
    });
  },
  unhover: (element: HTMLElement) => {
    gsap.to(element, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out",
    });
  },
  selected: (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
  },
  appear: (element: HTMLElement, index: number = 0) => {
    gsap.fromTo(
      element,
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        delay: index * 0.05,
        ease: "back.out(1.7)",
      },
    );
  },
};

// Button animations
export const buttonAnimations = {
  click: (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
  },
  pulse: (element: HTMLElement) => {
    gsap.to(element, {
      scale: 1.1,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
  },
};

// Text animations
export const textAnimations = {
  typewriter: (element: HTMLElement, onComplete?: () => void) => {
    const text = element.textContent || "";
    element.textContent = "";

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);
  },

  glitch: (element: HTMLElement) => {
    const tl = gsap.timeline();

    tl.to(element, {
      skewX: 5,
      duration: 0.05,
      ease: "power2.inOut",
    })
      .to(element, {
        skewX: -5,
        duration: 0.05,
        ease: "power2.inOut",
      })
      .to(element, {
        skewX: 0,
        duration: 0.05,
        ease: "power2.inOut",
      });

    return tl;
  },

  fadeIn: (element: HTMLElement, delay: number = 0) => {
    gsap.fromTo(
      element,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, delay, ease: "power2.out" },
    );
  },
};

// Modal animations
export const modalAnimations = {
  open: (overlay: HTMLElement, content: HTMLElement) => {
    const tl = gsap.timeline();

    tl.fromTo(
      overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" },
    ).fromTo(
      content,
      { opacity: 0, scale: 0.9, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.7)" },
      "-=0.1",
    );

    return tl;
  },

  close: (overlay: HTMLElement, content: HTMLElement) => {
    const tl = gsap.timeline();

    tl.to(content, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.2,
      ease: "power2.in",
    }).to(overlay, { opacity: 0, duration: 0.2, ease: "power2.in" }, "-=0.1");

    return tl;
  },
};

// Loading animations
export const loadingAnimations = {
  dots: (element: HTMLElement) => {
    const dots = element.querySelectorAll(".loading-dot");

    gsap.to(dots, {
      y: -10,
      duration: 0.5,
      stagger: 0.1,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
    });
  },

  progress: (element: HTMLElement, progress: number) => {
    gsap.to(element, {
      scaleX: progress,
      duration: 0.3,
      ease: "power2.out",
    });
  },
};

// Battle-specific animations
export const battleAnimations = {
  damageNumber: (element: HTMLElement) => {
    gsap.fromTo(
      element,
      { opacity: 1, scale: 0.5, y: 0 },
      {
        opacity: 0,
        scale: 1.5,
        y: -50,
        duration: 1,
        ease: "power2.out",
        onComplete: () => element.remove(),
      },
    );
  },

  healthBar: (element: HTMLElement, percentage: number) => {
    gsap.to(element, {
      scaleX: percentage,
      duration: 0.5,
      ease: "power2.out",
    });
  },

  shake: (element: HTMLElement, intensity: number = 10) => {
    gsap.to(element, {
      x: intensity,
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(element, { x: 0 });
      },
    });
  },
};

// Utility function to kill all animations on an element
export const killAnimations = (element: HTMLElement) => {
  gsap.killTweensOf(element);
};
