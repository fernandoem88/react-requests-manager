import uniqid from 'uniqid'
import { Subject } from './subject'
import { Store, ProcessDispatcher } from 'types'

export const defaultProcessDispatcher: ProcessDispatcher = new Subject()

const createStore = () => {
  const id = uniqid('StoreId__')
  const store: Store = {
    id,
    contexts: {},
    dispatchers: {
      $redux: new Subject(),
      $actions: new Subject()
    }
  }
  // *************** \\
  // *** getters *** \\
  // *************** \\

  return store
}

export default createStore
