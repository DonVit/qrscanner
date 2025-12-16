import { createSlice } from '@reduxjs/toolkit'
import { uniqueNumberId } from '../utils/utils'

interface LessonState {
  id?: number
  state?: string
  start?: string
  end?: string
}
const initialState: LessonState = { id: undefined, start: undefined, end: undefined }

const lessonSlice = createSlice({
  name: 'lesson',
  initialState,
  reducers: {
    start: (state) => ({
      ...state,
      id:uniqueNumberId(),
      state: 'started',
      start:new Date().toISOString(),
      end: undefined
    }),
    end: (state) => ({
      ...state,
      state: 'ended',
      end:new Date().toISOString()
    }),
  },
})

export const { start, end } = lessonSlice.actions
export default lessonSlice.reducer
