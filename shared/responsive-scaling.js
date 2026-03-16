/**
 * responsive-scaling.js
 * Utility that keeps an HTML5 Canvas logically sized while
 * stretching it to fill its container.  Call `initCanvas(canvas)`
 * once on page load; the canvas will re-scale on every resize.
 */

const ResponsiveScaling = (() => {
  /**
   * Initialise responsive scaling for a canvas element.
   *
   * @param {HTMLCanvasElement} canvas   - The canvas to manage.
   * @param {number}            [logicalWidth=600]  - Design-time pixel width.
   * @param {number}            [logicalHeight=600] - Design-time pixel height.
   * @returns {{ getScale: () => number }} - Object with helper to query current scale.
   */
  function initCanvas(canvas, logicalWidth = 600, logicalHeight = 600) {
    canvas.width  = logicalWidth;
    canvas.height = logicalHeight;

    let currentScale = 1;

    function resize() {
      const wrapper     = canvas.parentElement;
      const availWidth  = wrapper ? wrapper.clientWidth  : window.innerWidth;
      const availHeight = wrapper ? wrapper.clientHeight : window.innerHeight;

      // Maintain aspect ratio – fit inside available space.
      const scaleW = availWidth  / logicalWidth;
      const scaleH = availHeight / logicalHeight;
      currentScale = Math.min(scaleW, scaleH, 1); // Never scale up beyond logical size.

      const displayW = Math.floor(logicalWidth  * currentScale);
      const displayH = Math.floor(logicalHeight * currentScale);

      canvas.style.width  = displayW + 'px';
      canvas.style.height = displayH + 'px';
    }

    resize();

    const ro = window.ResizeObserver
      ? new ResizeObserver(resize)
      : null;

    if (ro && canvas.parentElement) {
      ro.observe(canvas.parentElement);
    } else {
      window.addEventListener('resize', resize);
    }

    return { getScale: () => currentScale };
  }

  /**
   * Convert a pointer / touch event coordinate to canvas logical pixels.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {MouseEvent|Touch}  event
   * @returns {{ x: number, y: number }}
   */
  function eventToCanvasCoords(canvas, event) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch  = event.touches && event.touches.length > 0
      ? event.touches[0]
      : (event.changedTouches && event.changedTouches.length > 0 ? event.changedTouches[0] : null);
    const clientX = (touch !== null) ? touch.clientX : event.clientX;
    const clientY = (touch !== null) ? touch.clientY : event.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }

  return { initCanvas, eventToCanvasCoords };
})();
