import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
} from 'redux-persist'

import receptsReducer from '../slices/receptsSlice'
import scannerMenuReducer from '../slices/scannerMenuSlice'
import loggerMiddleware from '../middlewares/loggerMiddleware'
import sagaMiddleware from '../middlewares/sagaMiddleware'
import rootSaga from '../sagas'

const middlewares = [sagaMiddleware, loggerMiddleware]

// Configure store
export const store = configureStore({
  reducer: combineReducers({
    recepts: receptsReducer,
    scannerMenu: scannerMenuReducer
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(middlewares),
})

// Run sagas
sagaMiddleware.run(rootSaga)

export const persistor = persistStore(store)


export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
