# react-requests-manager

> have a full control on your async actions

[![NPM](https://img.shields.io/npm/v/react-requests-manager.svg)](https://www.npmjs.com/package/react-requests-manager) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-requests-manager
```

## Usage

```tsx
import React, { Component } from 'react'

import { Single, Multi, Queue, createRequests } from 'react-requests-manager'
import 'react-requests-manager/dist/index.css'

// Single: once a process finish, others will abort
const fetchUser = Single(async (utils, userId: string) => {
  // in this example, utils will be of type RequestUtils<string>
  // utils.getRequestState() => fetchUser request state will all its processes
  // utils.getProcessState() => fetchUser current process state
  // return false; => to cancel the process: "false" is necessary
  utils.start(function onStart() {
    // on success logic: optional
  })
  const xhqr = API.get(userId)
  utils.onAbort(function abort() {
    // how will you abort your request if some one triggers an abort action
    xhqr.abort()
  })
  // utils.abortPrevious() => you can abort previous processes, (eg: pagination, ...)
  // utils.cancel() => if there are
  // utils.clearErrors()
  try {
    const result = await xhqr.send()
    utils.finish('success', function onSuccess() {
      // on success logic: optional
      dispath({ type: 'add_user', payload: result })
    })
  } catch (error) {
    utils.finish({ status: 'error', error }, function onError() {
      // on error logic: optional
    })
  }
})
// a process is suspended untill the previous will finish
const postImage = Queue(async (utils, { id: string }) => {
  // in this example, utils will be of type RequestUtilsQueue<{ id: string }>
  await utils.inQueue(function onStart(){
    // on start logic: optional
  })
  utils.onAbort(function abort(){
    // abort logic
  })
  try {
    utils.finish("success")
  } catch () {
    utils.finish("error")
  }
})

// parallel processes: all processes will finish
const deleteComment = Multi(async (utils, comment: Comment) => {
// in this example, utils will be of type RequestUtils<Comment>
// the request body is the same as in the case of Single Request Type
})

const REQS = { fetchUser, postImage, deleteComment }

// user request configurator: is an helper to bind the request to the request manager
const userRC = createRequests(REQS, {
  // here you can define extra actions over the request: abort, reset, clear error...
  abort(utils, requestName: keyof typeof request ){
    utils.abort(requestName)
  },
  abortAll(utils){
    utils.abort()
  }
})

// $user is a context and contains all the requests related to the user and all helpful utilities
export const $user = createManager("USER", userRequestsConfigurator)
// $user = { request, extraActions, useRequests, getState, bindToStateManager }
```

# Request types: **Single**, **Multi** and **Queue**

- Multi: all the started processes will eventually finish if no one abort or cancell them.

- Single: only one process can finish, and the remaining ones will automatically abort

- Queue: a new process will be suspended untill the previous one will finish/abort/cancel

# abort

by default all started or suspended process are kept in state when aborted
you can still change it when you call abort or abortPrevious

## License

MIT © [fernando ekutsu mondele](https://github.com/fernandoem88/react-requests-manager)
