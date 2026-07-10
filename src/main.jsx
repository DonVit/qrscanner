import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'
import './main.css'
import App from './App'

const notifyConnectionStatus = () => {
  store.dispatch({ type: 'network/STATUS_CHANGED', payload: navigator.onLine });
};

window.addEventListener('online', notifyConnectionStatus);
window.addEventListener('offline', notifyConnectionStatus);
notifyConnectionStatus();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
