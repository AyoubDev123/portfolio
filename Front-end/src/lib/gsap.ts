import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Force GPU layer on all transforms, avoid layout-triggering props
gsap.defaults({ force3D: true, overwrite: "auto" });

// Avoid ScrollTrigger recalculating on every frame during fast scroll
ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

export { gsap, ScrollTrigger };
