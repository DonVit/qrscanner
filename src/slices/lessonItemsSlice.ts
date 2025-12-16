import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getRandomWord, words } from "../utils/utils";

interface Item {
  id: number;
  wordId: number;
  word: string;
  playCount: number;
}

type LessonItems = Item[];

const incrementItemPlayCount = (items: LessonItems, id: number): Item[] => {
  return items.map(item =>
    item.id === id ? { ...item, playCount: item.playCount+1 } : item
  )
}

const addItemAction = (state: LessonItems):LessonItems => {
  const lastItem: Item | null = state.at(-1) ?? null
  const id = (lastItem?.id || 0) + 1;
  const wordId = getRandomWord();
  const word = words[wordId];
  return [
    ...state,
    {
      id,
      wordId,
      word,
      playCount: 0,
    },
  ];
};


const playItemAction = (state: LessonItems, action: PayloadAction<{id:number}>):LessonItems => {
  const { id } = action.payload
  return incrementItemPlayCount(state, id);
}


const removeItemsAction = ():LessonItems => []

const initialState: LessonItems = [];

const lessonItemsSlice = createSlice({
  name: "lessonItems",
  initialState,
  reducers: { addItem: addItemAction, playItem: playItemAction, removeItems: removeItemsAction },
});

export const { addItem, playItem, removeItems } = lessonItemsSlice.actions;
export default lessonItemsSlice.reducer;
