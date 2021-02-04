import { Single, Queue, Multi } from 'react-requests-manager'
import { configsUtils } from '../configs'
import * as helpers from '../reducers/helpers'

const { getConfig } = configsUtils
const { api } = getConfig()
type Params = { delay?: number; index: number }

export const login = Single(async (utils, params: Params) => {
  if (utils.getRequestState().isProcessing) return false
  const { abort, send } = api.fetchData(params.delay)
  // pass the abort function to the abortCallback
  // to tell the manager how to abort this process
  utils.onAbort(abort, { catchError: true })
  utils.start()
  try {
    const result = await send()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
    return
  } catch (error) {
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils, error)
    })
    return
  }
})

export const pagination = Single(async (utils, params: Params) => {
  const { abort, send } = api.fetchData(params.delay)
  utils.start()
  utils.abortPrevious(undefined, { keepInStateOnAbort: true })
  // pass the abort function to the abortCallback
  // to tell the manager how to abort this process
  utils.onAbort(abort, { catchError: true })
  try {
    const result = await send()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils, error)
    })
  }
})

export const fetchUser = Single(async (utils, params: Params) => {
  utils.start(() => {
    // on start logic: clear request error, dispatch to redux, ...
  })
  const { abort, send } = api.fetchData(params.delay)
  // pass the abort function to the abortCallback
  // to tell the manager how to abort this process
  utils.onAbort(abort, { catchError: true })
  try {
    const result = await send()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils, error)
    })
  }
})

// tslint-disable-next-line
export const postComment = Multi(async (utils, params: Params) => {
  utils.start(() => {
    // on start logic: clear request error, dispatch to redux, ...
  })
  const { abort, send } = api.fetchData(params.delay)
  // pass the abort function to the abortCallback
  // to tell the manager how to abort this process
  utils.onAbort(abort, { catchError: true })
  try {
    const result = await send()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils, error)
    })
  }
})

export const fetchImage = Queue(async (utils, params: Params) => {
  await utils.inQueue(() => {
    // on start logic: clear request error, dispatch to redux, ...
    // utils.clearError()
  })
  const { abort, send } = api.fetchData(params.delay)
  // pass the abort function to the abortCallback
  // to tell the manager how to abort this process
  utils.onAbort(abort, { catchError: true })
  try {
    const result = await send()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils, error)
    })
  }
})
