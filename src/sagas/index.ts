import { all } from 'redux-saga/effects'
import counterSaga from '../sagas/lessonSaga'

export default function* rootSaga() {
  yield all([counterSaga()])
}
