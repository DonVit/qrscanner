import { createSlice, PayloadAction } from '@reduxjs/toolkit'


const initialState: boolean = false

const scannerMenuSlice = createSlice({
  name: 'lesson',
  initialState,
  reducers: {
    setScannerMenu: (state: boolean, action: PayloadAction<boolean>):boolean => action.payload,
    scnnerOn: (state: boolean):boolean => true,
    scnnerOff: (state: boolean):boolean => false,
  },
})

export const { setScannerMenu, scnnerOff, scnnerOn } = scannerMenuSlice.actions
export default scannerMenuSlice.reducer
