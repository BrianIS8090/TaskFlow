export const CSS = {
  Transform: {
    toString: (transform?: { x?: number; y?: number }) => {
      if (!transform) return undefined;
      const x = transform.x ?? 0;
      const y = transform.y ?? 0;
      return `translate3d(${x}px, ${y}px, 0)`;
    }
  }
};
