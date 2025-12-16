import { takeEvery, put } from "redux-saga/effects";
// import { scnnerOff } from "../slices/scannerMenuSlice";
import { addRecept } from "../slices/receptsSlice";

function* handleAddRecept() {
  // yield put(scnnerOff());
}

export default function* receptsSaga() {
  // yield takeEvery(addRecept.type, handleAddRecept);
}
