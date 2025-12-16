import { createSelector } from 'reselect'
import type { RootState } from '../store'

// Base selector
const selectLessonItemsState = (state: RootState) => state.lessonItems

// Derived selectors
export const getLastLessonItem = createSelector(
  [selectLessonItemsState],
  lesson => lesson.at(-1)
)

