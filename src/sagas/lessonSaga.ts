import { all, call, put, select, takeEvery } from "redux-saga/effects";
import { addRecept, markUploaded, syncPendingReceiptsRequested, Recept } from "../slices/receptsSlice";
import { setSaveStatus } from "../slices/saveStatusSlice";
import type { RootState } from "../store";
import type { AuthState } from "../slices/authSlice";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/receipts";

async function uploadReceipt(receipt: Recept, auth: AuthState) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: JSON.stringify(receipt),
  });

  if (!response.ok) {
    throw new Error("Failed to upload receipt");
  }

  return response.json();
}

function* handleAddRecept(action: ReturnType<typeof addRecept>): Generator<any, void, any> {
  yield put(
    setSaveStatus({
      type: "pending",
      message: "Receipt added locally.",
    })
  );
}

function* handleSyncPendingReceipts(): Generator<any, void, any> {
  if (!navigator.onLine) {
    yield put(
      setSaveStatus({
        type: "error",
        message: "Offline: pending receipts will sync when online.",
      })
    );
    return;
  }

  const state: RootState = yield select((currentState: RootState) => currentState);
  const auth = state.auth;

  if (!auth?.user || !auth?.token) {
    yield put(
      setSaveStatus({
        type: "error",
        message: "Sign in to save scans on the backend.",
      })
    );
    return;
  }

  const pendingReceipts = Object.values(state.recepts).filter(
    (receipt) => receipt.uploaded === false
  );

  for (const receipt of pendingReceipts) {
    try {
      const response = yield call(uploadReceipt, receipt, auth);
      yield put(markUploaded(receipt.id));
      yield put(
        setSaveStatus({
          type: "success",
          message: response?.id
            ? "Receipt synced successfully."
            : "Receipt synced, but server response was unexpected.",
        })
      );
    } catch (error) {
      console.error("Unable to sync pending receipt", error);
      yield put(
        setSaveStatus({
          type: "error",
          message:
            error instanceof Error
              ? `Sync failed: ${error.message}`
              : "Sync failed due to an unknown error.",
        })
      );
      break;
    }
  }
}

function* watchConnectionChanges() {
  yield takeEvery("network/STATUS_CHANGED", handleSyncPendingReceipts);
}

export default function* receptsSaga() {
  yield all([
    takeEvery(addRecept.type, handleAddRecept),
    takeEvery(syncPendingReceiptsRequested.type, handleSyncPendingReceipts),
    watchConnectionChanges(),
  ]);
}
