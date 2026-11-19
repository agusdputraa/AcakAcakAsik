export function ArenaSurfaces({ canvasRef, labelsRef, fireworksRef, label = 'Arena permainan' }) {
  return (
    <>
      <div id="canvas-container" ref={canvasRef} aria-label={label} />
      <div id="labels-container" ref={labelsRef} aria-hidden="true" />
      <canvas id="fireworks-canvas" ref={fireworksRef} aria-hidden="true" />
    </>
  )
}
