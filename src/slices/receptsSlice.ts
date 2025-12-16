import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { uniqueNumberId } from "../utils/utils";

const persistConfig = {
  key: "recepts",
  storage,
};

export interface Recept {
  id: number;
  createdAt: string;
  url: string;
  uploaded: boolean;
}

export type Receipts = Record<number, Recept>;

const initialState: Receipts = {};

const receptsSlice = createSlice({
  name: "recepts",
  initialState,
  reducers: {
    addRecept: (state: Receipts, action: PayloadAction<string>): Receipts => {
      const url = action.payload;

      const exists = Object.values(state).some((r) => r.url === url);
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

    removeRecept: (state: Receipts, action: PayloadAction<number>): Receipts => {
      const { [action.payload]: _, ...rest } = state;
      return rest;
    },

    markUploaded: (state: Receipts, action: PayloadAction<number>): Receipts => {
      const id = action.payload;
      const recept = state[id];
      if (!recept) return state;

      return {
        ...state,
        [id]: { ...recept, uploaded: true },
      };
    },
  },
});

export const { addRecept, removeRecept, markUploaded } = receptsSlice.actions;
export default persistReducer(persistConfig, receptsSlice.reducer);
