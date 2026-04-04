export const goBackSmart = (navigation: {
  canGoBack?: () => boolean;
  goBack?: () => void;
  getParent?: () => unknown;
  getState?: () => unknown;
  navigate?: (name: string, params?: unknown) => void;
}) => {
  const currentState = navigation?.getState?.() as
    | {
        index?: number;
        routes?: Array<{ key: string; name: string }>;
        history?: Array<{ key?: string; type?: string }>;
      }
    | undefined;

  const currentRoutes = currentState?.routes ?? [];
  const currentRoute = typeof currentState?.index === 'number' ? currentRoutes[currentState.index] : undefined;
  const hasHomeRoute = currentRoutes.some((route) => route.name === 'Home');

  if (hasHomeRoute && currentRoute?.name !== 'Home') {
    navigation.navigate?.('Home');
    return true;
  }

  if (navigation?.canGoBack?.()) {
    navigation.goBack?.();
    return true;
  }

  const state = currentState as
    | {
        index?: number;
        routes?: Array<{ key: string; name: string }>;
        history?: Array<{ key?: string; type?: string }>;
      }
    | undefined;

  const routes = state?.routes ?? [];
  const history = Array.isArray(state?.history) ? state.history : [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    const routeKey = typeof entry?.key === 'string' ? entry.key : undefined;
    if (!routeKey || routeKey === currentRoute?.key) continue;

    const previousRoute = routes.find((route) => route.key === routeKey);
    if (previousRoute?.name) {
      navigation.navigate?.(previousRoute.name);
      return true;
    }
  }

  const parent = navigation?.getParent?.() as
    | {
        canGoBack?: () => boolean;
        goBack?: () => void;
      }
    | undefined;

  if (parent?.canGoBack?.()) {
    parent.goBack?.();
    return true;
  }

  return false;
};
