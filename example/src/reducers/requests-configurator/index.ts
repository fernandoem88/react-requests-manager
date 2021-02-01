import * as requests from './requests'
// import * as actions from './actions'
import { createRequests, createManager } from 'react-requests-manager'

const configurator = createRequests(requests, {
  reset: (utils, requestName: keyof typeof requests) => {
    utils.resetRequest(requestName)
  },
  clearError: (utils,  keyof typeof requests) => {
    utils.clearErrors(requestName)
  },
  abort: (utils, params: { requestName: keyof typeof requests; id?: string }) => {
    const { requestName, id } = params
    utils.abort(requestName, (pcss) => pcss.id === id)
  },
  abortAll: (utils) => {
    utils.abort()
  }
})

export const requestUtils = utils

export const {
  manager: $$,
  useRequests,
  getState: getRequests
} = createManager('TEST', configurator)
