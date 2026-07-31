import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import './main.css'
import App from './App'
import { loginSuccess } from './slices/authSlice'
import { syncPendingReceiptsRequested } from './slices/receptsSlice'
import { clearSaveStatus } from './slices/saveStatusSlice'

const notifyConnectionStatus = () => {
  store.dispatch({ type: 'network/STATUS_CHANGED', payload: navigator.onLine });
};

window.addEventListener('online', notifyConnectionStatus);
window.addEventListener('offline', notifyConnectionStatus);
notifyConnectionStatus();

// If redirected back from OAuth provider with authToken, set auth state
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('authToken');
    const username = params.get('username');

    if (!token || !username) {
      return;
    }

    const applyAuthFromRedirect = () => {
      store.dispatch(
        loginSuccess({ user: { id: `user-${username.toLowerCase()}`, username }, token })
      );
      store.dispatch(clearSaveStatus());
      store.dispatch(syncPendingReceiptsRequested());
      // remove the query params without reloading
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    };

    if (persistor.getState().bootstrapped) {
      applyAuthFromRedirect();
      return;
    }

    const unsubscribe = persistor.subscribe(() => {
      if (!persistor.getState().bootstrapped) {
        return;
      }
      unsubscribe();
      applyAuthFromRedirect();
    });
  } catch (e) {
    // ignore
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
