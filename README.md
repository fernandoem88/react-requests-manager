# react-requests-manager

> have a full control on your async actions

[![NPM](https://img.shields.io/npm/v/react-requests-manager.svg)](https://www.npmjs.com/package/react-requests-manager) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-requests-manager
```

# Request types: (**Single**, **Multi**, **Queue**)

- Single: only one process can finish (success or error), and the remaining ones will automatically abort

- Multi: all the started processes will eventually finish (success or error) if no one aborts or cancels them.

- Queue: a new process will be suspended untill the previous one will finish/abort/cancel

## Usage

we should pass an async callback of 1 or 2 parameters to the **request type wrapper**.

for example

```ts
const fetchData = Single<Params>(async function requestCallback(
  utils: RequestUtils<Params>,
  params: Params
) {
  // request logic
})
```

- utils: first parameter of the **request callback** and a provided utilities object that will let you manage your request state.
- params: (optional): the parameter you should pass to the final request when you will use it in your components.

to see a more detailed example, let's define a file **requests-manager/requests.ts** where we'll define some requests

```ts
import { Single, Multi, Queue, createRequests } from 'react-requests-manager'

// Single: once a process calls utils.finish, others will abort
export const fetchUser = Single(async (utils, userId: string) => {
  // in this example, utils will be of type RequestUtils<string>
  utils.start(function onStart() {
    // on success logic: optional
  })
  // you should replace this with a working example
  const xhqr = API.getUser(userId)
  utils.onAbort(function abort() {
    // how will you abort your request if some one triggers an abort action
    xhqr.abort()
  })
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

// Queue: a process is suspended untill the previous will finish
// all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const postImage = Queue(async (utils, image: Image) => {
  // in this example, utils will be of type RequestUtilsQueue<Image>
  await utils.inQueue(function onStart(){
    // on start logic: optional
  })
  // you should replace this with a working example
  const xhqr = API.postImage(image)
  utils.onAbort(function abort(){
    // abort logic
    xhqr.abort()
  })
  try {
    await xhqr.send()
    utils.finish("success")
  } catch () {
    utils.finish("error")
  }
})

// Multi: all processes will eventually reach "utils.finish" (success or error) if no one abort/cancel them
export const deleteComment = Multi(async (utils, comment: { id: string }) => {
  // in this example, utils will be of type RequestUtils<{ id: string }>
  // the request body is the same as in the case of Single Request Type
  utils.start()
  ...
  utils.onAbort(() => {
    // abort logic
  })
  ...
  try {
    ...
    utils.finsh("success")
  } catch () {
    utils.finish("error")
  }
})

```

(you can use [react-hooks-in-callback](https://www.npmjs.com/package/react-hooks-in-callback) library to use dipatch, store, history, etc... directly in your request callback body.)

now we have defined our requests callbacks, we can now bind them to the manager using **createManager** imported from _react-requests-manager_.

let's then implement it in the **requests-manager/index.ts** file like follows

```ts
import { createRequests, createManager } from 'react-requests-manager'
import * as REQS from './requests'
// REQS = { fetchUser, postImage, deleteComment }

// userRC: user requests configurator: helper that allows us to bind the requests to the requests manager
export const userRC = createRequests(REQS, {
  // here you can define extra actions over the requests: abort, reset, clear errors...
  abort(utils, requestName: keyof typeof request) {
    utils.abort(requestName)
  },
  abortAll(utils) {
    utils.abort()
  },
  reset(utils, requestName: keyof typeof request) {
    utils.resetRequest(requestName)
  }
})

export const $user = createManager('USER', userRC)

// $user: is the "user requests manager's context" and contains all requests related helpfull utilities.
// $user = { requests, extraActions, useRequests, getState, bindToStateManager }
```

## usage in the component

now we have the **$user** requests manager, we can use it in the component. let's see how!

```ts
import React from 'react'
import { $user } from '../requests-manager'

const MyComponent: React.FC<{ userId: string }> = (props) => {
  const fetchUserState = $user.useRequests((reqs: Requests) => reqs.fetchUser)
  // fetchUserState = { isProcessing, error: any, details: Details }
  // details = { processes: Dictionary<ProcessState>, count }
  // count = Record<processing | suspended | cancelled | aborted  | success | error | total, number>

  const label = fetchUserState.isProcessing ? 'fetching user...' : ''

  const handleFetch = () => {
    // this will call the fetchUser request defined in the requests.ts file
    // with userId as parameter and will turn the fetchUserState.isProcessing to true
    // if the processId is undefined, it means that the process was cancelled just after being created, otherwise you can use it to check the process state
    const processId = $user.request.fetchUser(props.userId)
  }
  const handleAbort = () => {
    // if the fetchUserState was processing, calling this will abort it and turn its isProcessing state to false.
    // to check the status of this process, you can use the processId and check its status in the fetchUserState.processes dictionary
    $user.extraActions.abort('fetchUser')
  }
  if (!!fetchUserState.error) {
    // error is the value passed in utils.finsh
    // for example: const errorMsg = "404 not found"
    // ({ status: "success/error", error: errorMsg })
    // fetchUserState.error will be 404 not found
    return <div>has fetching error: {fetchUserState.error}</div>
  }

  return (
    <div>
      {!!label && <h1>{label}</h1>}
      ...
      <buton onClick={handleFetch}>start fetching</buton>
      <buton onClick={handleAbort}> abort fetch user </buton>
    </div>
  )
}
```

# abort

by default all started or suspended process are kept in state when aborted
you can still change it when you call abort or abortPrevious

## License

MIT © [fernando ekutsu mondele](https://github.com/fernandoem88/react-requests-manager)
