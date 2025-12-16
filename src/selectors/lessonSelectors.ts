import { createSelector } from 'reselect'
import type { RootState } from '../store'

// Base selector
const selectLessonState = (state: RootState) => state.lesson

// Derived selectors
export const isLessonStarted = createSelector(
  [selectLessonState],
  lesson => lesson.state==='started'
)

