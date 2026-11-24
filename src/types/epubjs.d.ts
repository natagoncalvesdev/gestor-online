declare module "epubjs" {
  interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(evento: "relocated", callback: (local: { start: { cfi: string } }) => void): void;
  }
  interface Book {
    renderTo(elemento: HTMLElement, opcoes: Record<string, unknown>): Rendition;
    destroy(): void;
  }
  export default function ePub(entrada: ArrayBuffer): Book;
}
