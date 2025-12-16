import { createSelector } from 'reselect'
import type { RootState } from '../store'
import { Receipts, Recept } from '../slices/receptsSlice'

// Base selector
export const selectReceptsState1 = (state: RootState): Receipts => state.recepts

// // Derived selectors
// export const selecOrderedReceptsState: Receipts = createSelector(
//   [selectReceptsState],
//   (recept: Recept) => recept.createdAt==='started'
// )

export const selectReceptsState = createSelector(
  (state: { recepts: Receipts }) => state.recepts,
  (recepts) =>
    Object.values(recepts).filter(
      (r): r is Recept => typeof r === "object" && "id" in r
    )
);