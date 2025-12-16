import { createSelector } from 'reselect'
import type { RootState } from '../store'
import { Receipts, Recept } from '../slices/receptsSlice'

// Base selector
export const selectScannerMenu = (state: RootState): boolean => state.scannerMenu
