import React, { useState, useEffect } from 'react'
import uniqid from 'uniqid'

import {
  Root,
  Header,
  Title,
  Status,
  ActionWrapper,
  Btn,
  AddProcess
} from './styled'

import { $$ } from '../../RequestsManager'
import ProcessItem from '../ProcessItem'

interface Props {
  // requestName: keyof typeof $$.requests
  duration?: number
}

const labels = {
  fetchUser: 'single type',
  postComment: 'multi type',
  fetchImage: 'queue type'
}

const requestsList = Object.entries($$.requests).map(([key]) => {
  return {
    key,
    label: labels[key] || key
  }
})
const RequestItem: React.FC<Props> = (props) => {
  const [requestName, setRequestName] = useState<keyof typeof $$.requests>(
    requestsList[0].key as any
  )

  const req = $$.useRequests((reqs) => reqs[requestName])
  const [version, setVersion] = useState('')
  const [ids, setIds] = useState<string[]>([])

  const canReset = !req.isProcessing && req.details.count.total > 0

  const handleAbort = () => {
    req.isProcessing && $$.extraActions.abort({ requestName })
  }
  const handleReset = () => canReset && $$.extraActions.reset(requestName)

  const handleActionClick = () => {
    handleAbort()
    handleReset()
  }

  const handleSelection = (e: any) => {
    const newReqName = e.target.value as any
    $$.extraActions.abort({ requestName })
    $$.extraActions.reset(requestName)
    setRequestName(newReqName)
  }

  const actionBtnLabel = req.isProcessing
    ? 'abort all'
    : canReset
    ? 'reset'
    : ''
  useEffect(() => {
    if (req.isProcessing) {
      setVersion(uniqid())
    }
  }, [req.isProcessing])

  return (
    <Root>
      <Header>
        <Title>
          <select value={requestName} onChange={handleSelection}>
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
            version={version}
          />
        ))}
      </div>
      <AddProcess
        onClick={() => {
          setIds([...ids, uniqid()])
        }}
      >
        Add process
      </AddProcess>
    </Root>
  )
}
export type IRequestItemProps = Props
export default React.memo(RequestItem)
