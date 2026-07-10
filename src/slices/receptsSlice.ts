import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { uniqueNumberId } from "../utils/utils";

export interface Recept {
  id: number | string;
  createdAt: string;
  url: string;
  uploaded: boolean;
}

const persistConfig = {
  key: "recepts",
  storage,
};

export type Receipts = Record<string, Recept>;

const initialState: Receipts = {};

export const normalizeUrl = (value: string) => value.trim();

const receptsSlice = createSlice({
  name: "recepts",
  initialState,
  reducers: {
    syncPendingReceiptsRequested: (state: Receipts): Receipts => state,
    addRecept: (state: Receipts, action: PayloadAction<string>): Receipts => {
      const url = normalizeUrl(action.payload);

      if (!url) return state;

      const exists = Object.values(state).some((r) => normalizeUrl(r.url) === url);
      if (exists) return state;

      const id = uniqueNumberId();

      return {
        ...state,
        [id]: {
          id,
          createdAt: new Date().toISOString(),
          url,
          uploaded: false,
        },
      };
    },

    removeRecept: (state: Receipts, action: PayloadAction<string | number>): Receipts => {
      const id = String(action.payload);
      const { [id]: _, ...rest } = state;
      return rest;
    },

    markUploaded: (state: Receipts, action: PayloadAction<string | number>): Receipts => {
      const id = String(action.payload);
      const recept = state[id];
      if (!recept) return state;

      return {
        ...state,
        [id]: { ...recept, uploaded: true },
      };
    },
  },
});

export const { syncPendingReceiptsRequested, addRecept, removeRecept, markUploaded } = receptsSlice.actions;
export const receptsReducer = receptsSlice.reducer;
export default persistReducer(persistConfig, receptsReducer);
