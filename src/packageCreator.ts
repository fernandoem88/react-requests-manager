import createStore from './utils/store'
import getMulti from './utils/request-variants/Multi'
import getQueue from './utils/request-variants/Queue'
import getRequestsCreator from './utils/createRequests'

export const createPackage = () => {
  const store = createStore()
  const Multi = getMulti(store)
  const Queue = getQueue(store)
  const createRequests = getRequestsCreator(store)
  return {
    createRequests,
    Multi,
    Queue
  }
  // const Async = getAsync(store);
  // const Multi = getMulti(store);
  // const Queue = getQueue(store);
  // const createContext = getContextCreator(store);
  // const combineContexts = getCombineContexts(store);
  // return {
  //   storeId: store.id,
  //   Async,
  //   Multi,
  //   Queue,
  //   createContext,
  //   combineContexts,
  // };
}
