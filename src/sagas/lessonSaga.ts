import { all, call, put, select, takeEvery } from "redux-saga/effects";
import { addRecept, isValidUrl, markUploaded, syncPendingReceiptsRequested, Recept } from "../slices/receptsSlice";
import { setSaveStatus } from "../slices/saveStatusSlice";
import type { RootState } from "../store";
import type { AuthState } from "../slices/authSlice";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/receipts";

export function getSyncStatusMessage(pendingCount: number) {
  return pendingCount === 0 ? "All receipts are already uploaded." : "Syncing receipts...";
}

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
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upload receipt");
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
  const hasAuth = Boolean(auth?.user && auth?.token);

  if (!hasAuth) {
    return;
  }

  const receiptsToSync = Object.values(state.recepts).filter(
    (receipt): receipt is Recept =>
      Boolean(receipt && typeof receipt === "object" && "id" in receipt && "url" in receipt && isValidUrl(receipt.url))
  );

  if (receiptsToSync.length === 0) {
    yield put(
      setSaveStatus({
        type: "success",
        message: getSyncStatusMessage(0),
      })
    );
    return;
  }

  yield put(
    setSaveStatus({
      type: "pending",
      message: getSyncStatusMessage(receiptsToSync.length),
    })
  );

  let syncFailed = false;
  for (const receipt of receiptsToSync) {
    try {
      yield call(uploadReceipt, receipt, auth);
      yield put(markUploaded(receipt.id));
    } catch (error) {
      console.error("Unable to sync pending receipt", error);
      syncFailed = true;
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

  if (!syncFailed) {
    yield put(
      setSaveStatus({
        type: "success",
        message: "All pending receipts synced successfully.",
      })
    );
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
