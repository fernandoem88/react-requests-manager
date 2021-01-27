import createRequests from './utils/createRequests'
// import createContext from './utils/createContext'
import createContextsGroup from './utils/createContextsGroup'
import Queue from './utils/request-variants/Queue'
import Single from './utils/request-variants/Single'

export { default as Single } from './utils/request-variants/Single'
export { default as Multi } from './utils/request-variants/Multi'
export { default as Queue } from './utils/request-variants/Queue'
export { default as createRequests } from './utils/createRequests'
export { default as createContext } from './utils/createContext'
export { default as createContextsGroup } from './utils/createContextsGroup'

const getUser = Single(async (utils, id: number) => {
  const initialState = utils.getRequestState()
  if (initialState.isProcessing) {
    // utils.abortPrevious()
    utils.abortPrevious((pcss) => pcss.params > 3)
  }
  utils.onAbort(() => {
    // some where in the code, some one called abort(with this process id)
    // so let the manager know how to abort this process
    // here you can dispatch some redux actions
  })
  // now we can start the process
  utils.start() // this will dispatch a start action to the useRequests hook
  try {
    //
    utils.finish('success', () => {
      // dispatch redux
    })
  } catch (error) {
    utils.finish('error', () => {
      // dispatch redux
    })
  }
})

const deleteUser = Queue(async (utils, num: number) => {
  utils.abortPrevious()
  const state = utils.getRequestState()

  await utils.inQueue()
  utils.onAbort(() => {
    // abort logic goes here
  })
  try {
    utils.finish('success', function onFinish() {
      // dispatch to redux
    })
  } catch (error) {
    utils.finish('error', function onFinish() {
      // dispatch to redux
    })
  }
})
const requests = {
  getUser,
  deleteUser
}
const user = createRequests(
  {
    requests
  },
  {
    actions: {
      stopTest(utils) {
        utils.getRequestState('deleteUser')
        const state = utils.getRequestsState()
      }
    }
  }
)

const posts = createRequests(
  {
    requests: {
      getPosts: async (utils) => {
        utils.start()
      }
    }
  },
  { actions: { setPippo() {} } }
)

const appRM = createContextsGroup({
  user,
  posts
})
const { requestsManager: $, useRequests, bindToStateManager } = appRM
$.user.actions.stopTest()
const deleteUserState = useRequests((reqs) => reqs.user.deleteUser)

const { createSelectorHook } = bindToStateManager({
  subscribe: null as any,
  getState: () => {
    return { title: 'pippo' }
  }
})

const useSelector = createSelectorHook()
const ccc = useSelector((state, reqs) => state.title)
// const { useRequests } = createContext('pippo', conf)
