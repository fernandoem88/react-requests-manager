import { Single, Queue, Multi } from 'react-requests-manager'
import { configsUtils } from '../../configs'
// import { ActionType } from '.'
const { getConfig } = configsUtils
const { api } = getConfig()

export const singleRequest = Single(async (utils, delay?: number) => {
  utils.start(() => {
    // on start logic
  })
  const { abort, execute } = api.testRequest(delay)
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

export const multiRequest = Multi(async (utils, delay?: number) => {
  utils.start(() => {
    // on start logic
  })
  const { abort, execute } = api.testRequest(delay)
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

export const queueRquest = Queue(async (utils, delay?: number) => {
  await utils.inQueue(() => {
    // on start logic
  })
  const { abort, execute } = api.testRequest(delay)
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
