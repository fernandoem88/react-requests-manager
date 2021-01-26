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

const userConfig = createRequests(
  {
    requests: {
      getUser: Single(async (utils) => {
        utils.start()
        const state = utils.getRequestState()
      }),
      deleteUser: Queue<string>(async (utils, num) => {
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
    }
  },
  { actions: { stopTest(utils) {} } }
)

const postConfig = createRequests(
  {
    requests: {
      getPosts: async (utils) => {
        utils.start()
      }
    }
  },
  { actions: { setPippo() {} } }
)

const appRM = createContextsGroup('app', {
  user: userConfig,
  posts: postConfig
})
const { requestsManager, useRequests, bindToStateManager } = appRM
requestsManager.user.actions.stopTest()
useRequests((state) => state.user)

const { createSelectorHook } = bindToStateManager({
  subscribe: null as any,
  getState: () => {
    return { title: 'pippo' }
  }
})

const useAppSelector = createSelectorHook()
const ccc = useAppSelector((state, reqs) => state.title)
// const { useRequests } = createContext('pippo', conf)
