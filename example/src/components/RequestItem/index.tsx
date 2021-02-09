import React, { useEffect, useState } from 'react'
import uniqid from 'uniqid'
import { useDispatch } from 'react-redux'

import {
  Root,
  Header,
  Title,
  Status,
  ActionWrapper,
  Btn,
  AddProcess
} from './styled'

import { $user } from '../../store/async'
import ProcessItem from '../ProcessItem'
import { ActionType } from '../../store/reducers'
import { labels, requestsNames } from '../../constants'

interface Props {
  duration?: number
}

const requestsList = requestsNames.map((key) => {
  return {
    key,
    label: labels[key]?.title || key
  }
})
const RequestItem: React.FC<Props> = (props) => {
  const [requestName, setRequestName] = useState<keyof typeof $user.requests>(
    requestsList[0].key as any
  )
  const [ids, setIds] = useState<string[]>(['loader-1', 'loader-2'])
  const req = $user.useRequests((reqs) => reqs[requestName])
  const dispatch = useDispatch()
  const canReset = !req.isProcessing && req.details.count.total > 0

  const handleAbort = () => {
    if (req.isProcessing) $user.extraActions.abort({ requestName })
  }
  const handleReset = () => {
    if (canReset) $user.extraActions.reset(requestName)
  }

  const handleActionClick = () => {
    handleAbort()
    handleReset()
  }

  const handleSelection = (e: any) => {
    const newReqName = e.target.value as any
    $user.extraActions.abort({ requestName })
    $user.extraActions.reset(requestName)
    setRequestName(newReqName)
    dispatch({ type: ActionType.SET_TYPE, payload: newReqName })
  }

  useEffect(() => {
    const reqName = requestsNames[0]
    dispatch({ type: ActionType.SET_TYPE, payload: reqName })
  }, [dispatch])

  useEffect(() => {
    if (!req.isProcessing) return
    dispatch({ type: ActionType.SET_USER_LIST, payload: [] })
  }, [dispatch, req.isProcessing])

  const actionBtnLabel = req.isProcessing
    ? 'abort all'
    : canReset
    ? 'reset'
    : ''

  return (
    <Root>
      <Header>
        <Title>
          <select value={requestName as string} onChange={handleSelection}>
            {requestsList.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </Title>
        {req.isProcessing && <Status>is processing</Status>}
        <ActionWrapper>
          {(req.isProcessing || canReset) && (
            <Btn canReset={canReset} onClick={handleActionClick}>
              {actionBtnLabel}
            </Btn>
          )}
        </ActionWrapper>
      </Header>
      <div>
        {ids.map((id, index) => (
          <ProcessItem
            key={id}
            requestName={requestName as any}
            index={index}
            duration={props.duration}
          />
        ))}
      </div>
      <AddProcess
        onClick={() => {
          setIds([...ids, uniqid()])
        }}
      >
        add process loader
      </AddProcess>
    </Root>
  )
}
export type IRequestItemProps = Props
export default React.memo(RequestItem)
