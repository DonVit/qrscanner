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
  (state: RootState) => state.recepts,
  (recepts) =>
    Object.values(recepts)
      .filter((r): r is Recept => typeof r === "object" && "id" in r)
      .sort((a, b) => {
        const aTime = Date.parse(a.createdAt);
        const bTime = Date.parse(b.createdAt);
        return bTime - aTime;
      })
);

export const selectUploadedCount = createSelector(
  [selectReceptsState],
  (recepts) => recepts.filter((receipt) => Boolean(receipt?.uploaded)).length
);

export const selectTotalScans = createSelector(
  [selectReceptsState],
  (recepts) => recepts.length
);

export const selectPendingCount = createSelector(
  [selectTotalScans, selectUploadedCount],
  (totalScans, uploadedCount) => totalScans - uploadedCount
);

export const selectUniqueScans = createSelector(
  [selectReceptsState],
  (recepts) =>
    new Set(
      recepts
        .map((receipt) => String(receipt?.url ?? '').trim())
        .filter(Boolean)
    ).size
);