import * as requests from './requests'
import { createRequests, createManager } from 'react-requests-manager'

const configurator = createRequests(requests, {
  reset(utils, requestName: keyof typeof requests) {
    utils.resetRequest(requestName)
  },
  clearError(utils, requestName: keyof typeof requests) {
    utils.clearErrors(requestName)
  },
  abort(utils, params: { requestName: keyof typeof requests; id?: string }) {
    const { requestName, id } = params
    utils.abort(requestName, (pcss) => pcss.id === id)
  },
  abortAll(utils) {
    utils.abort()
  }
})

export const $$ = createManager('TEST', configurator)
