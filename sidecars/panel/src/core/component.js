/**
 * @fileoverview Vue-inspired lightweight component kernel supporting
 * props, custom v-model value transmission (emit('update:modelValue', val)),
 * reactive subscriptions, and lifecycle cleanup.
 */

const globalEmitListeners = new Set();

export function onComponentEmit(listener) {
  globalEmitListeners.add(listener);
  return () => globalEmitListeners.delete(listener);
}

export function defineComponent({ name, setup }) {
  return function createInstance(initialProps = {}) {
    let props = { ...initialProps };
    const cleanups = [];
    const eventHandlers = new Map();

    function on(event, fn) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event).add(fn);
      return () => eventHandlers.get(event)?.delete(fn);
    }

    function emit(event, payload) {
      // Support Vue-style onUpdateModelValue / onChange prop callbacks
      if (event === 'update:modelValue') {
        if (typeof props.onUpdateModelValue === 'function') {
          props.onUpdateModelValue(payload);
        }
        if (typeof props.onChange === 'function') {
          props.onChange(payload);
        }
      }
      const handlers = eventHandlers.get(event);
      if (handlers) {
        for (const fn of handlers) {
          fn(payload);
        }
      }
      for (const observer of globalEmitListeners) {
        observer({
          component: name || 'AnonymousComponent',
          event,
          payload,
          timestamp: Date.now(),
        });
      }
    }

    function onCleanup(fn) {
      if (typeof fn === 'function') {
        cleanups.push(fn);
      }
    }

    const setupResult = setup({
      getProps: () => props,
      emit,
      onCleanup,
    });

    function setProps(nextProps = {}) {
      props = { ...props, ...nextProps };
      if (typeof setupResult.onPropsChange === 'function') {
        setupResult.onPropsChange(props);
      }
    }

    function setValue(nextValue) {
      setProps({ modelValue: nextValue });
    }

    function getValue() {
      return typeof setupResult.getValue === 'function'
        ? setupResult.getValue()
        : props.modelValue;
    }

    function destroy() {
      for (const fn of cleanups.splice(0)) {
        try {
          fn();
        } catch (err) {
          console.error(`[${name}] cleanup error:`, err);
        }
      }
      if (setupResult.el?.parentNode) {
        setupResult.el.parentNode.removeChild(setupResult.el);
      }
    }

    return {
      name,
      el: setupResult.el,
      refs: setupResult.refs || {},
      on,
      emit,
      setProps,
      setValue,
      getValue,
      destroy,
      ...setupResult.methods,
    };
  };
}
