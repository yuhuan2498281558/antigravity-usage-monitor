/**
 * @fileoverview Root Application Shell (App.js).
 * Combines the compact dual-layer header (TopSessionHeader + TopLongPillNav)
 * and single-viewport functional views.
 */

import { defineComponent } from './core/component.js';
import { h, patchAttr } from './core/domPatch.js';
import { telemetryStore } from './store/telemetryStore.js';
import { uiStore, VIEW_TABS } from './store/uiStore.js';
import { TopSessionHeader } from './components/layout/TopSessionHeader.js';
import { TopLongPillNav } from './components/ui/TopLongPillNav.js';
import { LiveOverviewView } from './views/LiveOverviewView.js';
import { ConsumptionView } from './views/ConsumptionView.js';
import { StepsDetailView } from './views/StepsDetailView.js';
import { SettingsView } from './views/SettingsView.js';

export const App = defineComponent({
  name: 'App',
  setup({ onCleanup }) {
    const sessionHeader = TopSessionHeader();
    const topPillNav = TopLongPillNav({
      modelValue: uiStore.getState().activeView,
      items: VIEW_TABS,
      onUpdateModelValue: (nextView) => {
        uiStore.setState({ activeView: nextView });
      },
    });

    const overviewView = LiveOverviewView();
    const consumptionView = ConsumptionView();
    const stepsView = StepsDetailView();
    const settingsView = SettingsView();

    const viewMap = {
      overview: overviewView.el,
      consumption: consumptionView.el,
      steps: stepsView.el,
      settings: settingsView.el,
    };

    const stageEl = h('div', { className: 'viewport-stage' }, [
      overviewView.el,
      consumptionView.el,
      stepsView.el,
      settingsView.el,
    ]);

    const shellEl = h('main', { className: 'app-shell' }, [
      h('div', { className: 'top-deck' }, [sessionHeader.el, topPillNav.el]),
      stageEl,
    ]);

    const unsubUi = uiStore.subscribe(
      (st) => st.activeView,
      (activeView) => {
        topPillNav.setValue(activeView);
        for (const [key, paneEl] of Object.entries(viewMap)) {
          patchAttr(paneEl, 'hidden', key !== activeView);
        }
        if (activeView === 'overview') {
          overviewView.refs?.viewScrollbar?.refresh();
        } else if (activeView === 'consumption') {
          consumptionView.refs?.viewScrollbar?.refresh();
        } else if (activeView === 'steps') {
          stepsView.refs?.stepsScroll?.refresh();
          stepsView.refs?.modelsScroll?.refresh();
        }
      }
    );

    const unsubStepCount = telemetryStore.subscribe(
      (st) => st.telemetry?.activeConversation?.stepCount ?? 0,
      (stepCount) => {
        topPillNav.setProps({
          items: VIEW_TABS.map((t) =>
            t.value === 'steps' ? { ...t, badge: stepCount > 0 ? stepCount : '' } : t
          ),
        });
      }
    );

    onCleanup(() => {
      unsubUi();
      unsubStepCount();
      sessionHeader.destroy();
      topPillNav.destroy();
      overviewView.destroy();
      consumptionView.destroy();
      stepsView.destroy();
      settingsView.destroy();
    });

    return {
      el: shellEl,
      refs: {
        sessionHeader,
        topPillNav,
        overviewView,
        consumptionView,
        stepsView,
        settingsView,
      },
    };
  },
});
