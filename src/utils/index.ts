import getSingle from './request-variants/Single'
import getMulti from './request-variants/Multi'
import getQueue from './request-variants/Queue'
import getCreateRequests from './create-requests'
import getCreateContext from './create-context'
import getCreateContextsGroup from './create-contexts-group'

export const createRequests = getCreateRequests()
export const createManager = getCreateContext()
export const createGroupManager = getCreateContextsGroup()
export const Single = getSingle()
export const Multi = getMulti()
export const Queue = getQueue()

// const conf = createRequests({ fetch: async () => {} }, { abort() {} })
