import { ActionUtils } from 'react-requests-manager'
import * as requests from './requests'

type AU = ActionUtils<typeof requests>

export const reset = (utils: AU, requestName: keyof typeof requests) => {
  utils.resetRequest(requestName)
}

export const clearError = (utils: AU, requestName: keyof typeof requests) => {
  utils.clearErrors(requestName)
}

export const abort = (
  utils: AU,
  params: { requestName: keyof typeof requests; id?: string }
) => {
  const { requestName, id } = params
  utils.abort(requestName, !id ? undefined : (pcss) => pcss.id === id)
}

export const abortAllRequests = (utils: AU) => {
  utils.abort()
}
