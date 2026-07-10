import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SaveStatusType = "idle" | "pending" | "success" | "duplicate" | "error";

export interface SaveStatus {
  type: SaveStatusType;
  message: string;
}

const initialState: SaveStatus = {
  type: "idle",
  message: "",
};

const saveStatusSlice = createSlice({
  name: "saveStatus",
  initialState,
  reducers: {
    setSaveStatus: (state, action: PayloadAction<SaveStatus>) => action.payload,
    clearSaveStatus: () => initialState,
  },
});

export const { setSaveStatus, clearSaveStatus } = saveStatusSlice.actions;
export default saveStatusSlice.reducer;
