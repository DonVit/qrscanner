import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
} from 'redux-persist'

declare global {
  interface Window {
    __store__?: typeof store;
  }
}

import receptsReducer from '../slices/receptsSlice'
import scannerMenuReducer from '../slices/scannerMenuSlice'
import saveStatusReducer from '../slices/saveStatusSlice'
import authReducer from '../slices/authSlice'
import loggerMiddleware from '../middlewares/loggerMiddleware'
import sagaMiddleware from '../middlewares/sagaMiddleware'
import rootSaga from '../sagas'

const middlewares = [sagaMiddleware, loggerMiddleware]

// Configure store
export const store = configureStore({
  reducer: combineReducers({
    recepts: receptsReducer,
    scannerMenu: scannerMenuReducer,
    saveStatus: saveStatusReducer,
    auth: authReducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(middlewares),
})

// Run sagas
sagaMiddleware.run(rootSaga)

export const persistor = persistStore(store)

if (import.meta.env.DEV) {
  window.__store__ = store
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
