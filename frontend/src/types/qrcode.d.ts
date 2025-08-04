declare module 'qrcode' {
  const toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    options: { width?: number },
    callback: (error: Error | null) => void
  ) => void;

  export { toCanvas };
}
