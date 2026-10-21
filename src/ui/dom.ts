type Child = Node | string;

/** Crea un elemento con clase e hijos. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.append(...children);
  return el;
}

export function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const b = h('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Asigna texto solo si cambia, para no tocar el DOM en cada tick. */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${Math.floor(seconds)} s`;
}

export const percent = (x: number): string => `${Math.round(x * 100)} %`;
