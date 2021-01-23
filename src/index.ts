import createStore from './utils/store'
import getMulti from './utils/request-variants/Multi'
import getQueue from './utils/request-variants/Queue'
import getRequestsCreator from './utils/createRequests'

const store = createStore()

export const Multi = getMulti(store)
export const Queue = getQueue(store)
export const createRequests = getRequestsCreator(store)
