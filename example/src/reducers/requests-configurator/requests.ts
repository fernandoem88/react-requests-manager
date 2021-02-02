import { Single, Queue, Multi } from 'react-requests-manager'
import { configsUtils } from '../../configs'
import * as helpers from '../helpers'

const { getConfig } = configsUtils
const { api } = getConfig()
type Params = { delay?: number; index: number }

export const singleFetch = Single(async (utils, params: Params) => {
  utils.start(() => {
    // on start logic: clear request error, dispatch to redux, ...
  })
  const { abort, execute } = api.fetchData(params.delay, ['user 1', 'user 2'])
  utils.onAbort(abort, { catchError: true })
  try {
    const result = await execute()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    helpers.logError(utils, error)
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils)
    })
  }
})

// tslint-disable-next-line
export const multiFetch = Multi(async (utils, params: Params) => {
  utils.start(() => {
    // on start logic: clear request error, dispatch to redux, ...
  })
  const { abort, execute } = api.fetchData(params.delay, ['user 1', 'user 2'])
  utils.onAbort(abort)
  try {
    const result = await execute()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    helpers.logError(utils, error)
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils)
    })
  }
})

export const queueFetch = Queue(async (utils, params: Params) => {
  await utils.inQueue(() => {
    // on start logic: clear request error, dispatch to redux, ...
    // utils.clearError()
  })
  const { abort, execute } = api.fetchData(params.delay, ['user 1', 'user 2'])
  utils.onAbort(abort)
  try {
    const result = await execute()
    utils.finish('success', () => {
      // success logic goes here: dispatch to redux, ...
      helpers.dispatchSuccess(utils, result)
    })
  } catch (error) {
    helpers.logError(utils, error)
    utils.finish({ status: 'error', error: error?.message }, () => {
      // error logic goes here: dispatch to redux, ...
      helpers.dispatchError(utils)
    })
  }
})
