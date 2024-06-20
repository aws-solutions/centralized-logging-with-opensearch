import React, { PropsWithChildren } from "react";
import { RenderOptions, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { RootState } from "reducer/reducers";
import { AppStore, setupStore } from "reducer/store";

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}


export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = setupStore(preloadedState), ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren<object>): JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }

  // Return an object with the store and all of RTL's query functions
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
