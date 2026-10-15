/**
 * @fileoverview Incremental DOM patching utilities and keyed list reconciler.
 * Prevents full innerHTML replacements and preserves active DOM element state.
 */

export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val === undefined || val === null || val === false) continue;
      if (key === 'className' || key === 'class') {
        el.className = String(val);
      } else if (key === 'dataset' && typeof val === 'object') {
        for (const [dk, dv] of Object.entries(val)) {
          if (dv !== undefined && dv !== null) {
            el.dataset[dk] = String(dv);
          }
        }
      } else if (key.startsWith('on') && typeof val === 'function') {
        const evt = key.slice(2).toLowerCase();
        el.addEventListener(evt, val);
      } else if (key === 'text') {
        el.textContent = String(val);
      } else if (val === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

export function patchText(el, nextValue) {
  if (!el) return false;
  const nextStr = String(nextValue ?? '');
  if (el.textContent === nextStr) {
    return false;
  }
  el.textContent = nextStr;
  return true;
}

export function patchAttr(el, attrName, nextValue) {
  if (!el) return false;
  if (nextValue === null || nextValue === undefined || nextValue === false) {
    if (!el.hasAttribute(attrName)) {
      return false;
    }
    el.removeAttribute(attrName);
    return true;
  }
  const strVal = nextValue === true ? '' : String(nextValue);
  if (el.getAttribute(attrName) === strVal) {
    return false;
  }
  el.setAttribute(attrName, strVal);
  return true;
}

export function patchClasses(el, classMap) {
  if (!el || !classMap) return false;
  let mutated = false;
  for (const [cls, active] of Object.entries(classMap)) {
    if (!cls) continue;
    const has = el.classList.contains(cls);
    const shouldHave = Boolean(active);
    if (has !== shouldHave) {
      el.classList.toggle(cls, shouldHave);
      mutated = true;
    }
  }
  return mutated;
}

export function patchStyleVar(el, varName, nextValue) {
  if (!el) return false;
  const strVal = String(nextValue ?? '');
  const prev = el.style.getPropertyValue(varName);
  if (prev === strVal) {
    return false;
  }
  el.style.setProperty(varName, strVal);
  return true;
}

const keyedListState = new WeakMap();

/**
 * Keyed incremental list reconciler.
 * Reuses existing DOM nodes by key and patches only changed items in-place.
 */
export function patchKeyedList(container, items, { keyFn, sigFn, createRow, updateRow }) {
  if (!container) return;
  let map = keyedListState.get(container);
  if (!map) {
    map = new Map();
    keyedListState.set(container, map);
  }

  const nextKeys = new Set();
  const orderedNodes = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = String(keyFn(item, i));
    const sig = sigFn ? String(sigFn(item, i)) : JSON.stringify(item);
    nextKeys.add(key);

    let record = map.get(key);
    if (!record) {
      const created = createRow(item, i);
      record = {
        el: created.el,
        refs: created.refs,
        sig,
      };
      updateRow(record.refs, item, i, record.el);
      map.set(key, record);
    } else if (record.sig !== sig) {
      record.sig = sig;
      updateRow(record.refs, item, i, record.el);
    }
    orderedNodes.push(record.el);
  }

  // Remove stale keys
  for (const [oldKey, record] of map.entries()) {
    if (!nextKeys.has(oldKey)) {
      if (record.el.parentNode === container) {
        container.removeChild(record.el);
      }
      map.delete(oldKey);
    }
  }

  // Reorder or insert nodes with minimal DOM moves
  for (let i = 0; i < orderedNodes.length; i++) {
    const targetNode = orderedNodes[i];
    const currentNode = container.children[i] || null;
    if (currentNode !== targetNode) {
      container.insertBefore(targetNode, currentNode);
    }
  }
}
