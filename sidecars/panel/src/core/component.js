/**
 * @fileoverview Vue-inspired lightweight component kernel supporting
 * props, custom v-model value transmission (emit('update:modelValue', val)),
 * reactive subscriptions, and lifecycle cleanup.
 */

export function defineComponent({ name, setup }) {
  return function createInstance(initialProps = {}) {
    let props = { ...initialProps };
    const cleanups = [];

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
    }

    function onCleanup(fn) {
      if (typeof fn === 'function') {
        cleanups.push(fn);
      }
    }

    let setupResult = null;

    function setProps(nextProps = {}) {
      props = { ...props, ...nextProps };
      if (setupResult && typeof setupResult.onPropsChange === 'function') {
        setupResult.onPropsChange(props);
      }
    }

    function setValue(nextValue) {
      setProps({ modelValue: nextValue });
    }

    setupResult = setup({
      getProps: () => props,
      setProps,
      emit,
      onCleanup,
    });

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
      setProps,
      setValue,
      destroy,
      ...setupResult.methods,
    };
  };
}
