import { createStore, Store } from 'redux'
import { reducer, State } from './reducers'
import { $user } from './async'

const initialState = { type: '', users: [] }
export const APP_STORE: Store<State, any> = createStore(reducer, initialState)
export const { useSelector: useStoreAndRequests } = $user.bindToStateManager(
  APP_STORE
)

APP_STORE.subscribe(() => {
  console.log('subscription', APP_STORE.getState())
})
