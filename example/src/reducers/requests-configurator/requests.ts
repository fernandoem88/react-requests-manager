import { Single, Queue, Multi } from 'react-requests-manager'
import { configsUtils } from '../../configs'
// import { ActionType } from '.'
const { getConfig } = configsUtils
const { api } = getConfig()
type Params = { delay?: number; index: number }
export const singleRequest = Single(async (utils, params: Params) => {
  // const t = false as any
  // if (!t) {
  //   utils.cancel()
  // }
  utils.start(() => {
    // on start logic
  })
  const { abort, execute } = api.testRequest(params.delay)
  utils.onAbort(() => {
    abort()
  })

  try {
    await execute()
    utils.finish('success', () => {
      // dispatch({ type: ActionType.ADD_TODO, payload: result })
    })
  } catch (error) {
    utils.finish('error', () => {
      // error logic goes here
    })
  }
})

// tslint-disable-next-line
export const multiRequest = Multi(async (utils, params: Params) => {
  utils.start(() => {
    // on start logic
  })
  const { abort, execute } = api.testRequest(params.delay)
  utils.onAbort(() => {
    abort()
  })

  try {
    await execute()
    utils.finish('success', () => {
      // dispatch({ type: ActionType.ADD_TODO, payload: result })
    })
  } catch (error) {
    utils.finish('error', () => {
      // error logic goes here
    })
  }
})

export const queueRequest = Queue(async (utils, params: Params) => {
  await utils.inQueue(() => {
    // on start logic
    // utils.clearError()
  })
  const { abort, execute } = api.testRequest(params.delay)
  utils.onAbort(async () => {
    abort()
  })
  try {
    await execute()
    utils.finish('success', () => {
      // dispatch({ type: ActionType.ADD_TODO, payload: result })
      console.log('error')
    })
  } catch (error) {
    utils.finish({ status: 'error', error }, () => {
      // error logic goes here
      console.log('error', '500: Server Error')
    })
  }
})
