import styled from 'styled-components'

export const Root = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Root'
})<{}>`
  /*css attribrutes for Root component*/
`
Root.displayName = 'RequestItemRoot'

export const Header = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Header'
})<{}>`
  display: flex;
  padding-bottom: 12px;
  height: 24px;
`
export const Title = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Title'
})<{}>`
  padding-right: 6px;
  flex-grow: 1;
  & > select {
    height: 24px;
  }
`
export const Status = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Status'
})<{}>`
  text-align: center;
  flex-grow: 1;
`
Status.displayName = 'RequestItemStatus'
export const ActionWrapper = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--ActionWrapper'
})<{}>`
  flex-grow: 1;
  display: flex;
  flex-direction: row-reverse;
`

export const Btn = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Btn'
})<{ canReset: boolean }>`
  cursor: pointer;
  text-align: center;
  text-transform: capitalize;
  width: 80px;
  border-radius: 5px;
  border: solid 1px ${(p) => (p.canReset ? 'lightblue' : 'orange')};
  /* color: ${(p) => (p.canReset ? 'white' : 'black')}; */
  color: ${(p) => (p.canReset ? '#2a5867' : '#442d04')};
  padding: 3px 0;
`
Btn.displayName = 'RequestItemBtn'
ActionWrapper.displayName = 'RequestItemActionWrapper'
Title.displayName = 'RequestItemTitle'
Header.displayName = 'RequestItemHeader'

export const AddProcess = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--AddProcess'
})<{}>`
  width: 100%;
  cursor: pointer;
  text-align: center;
  border-radius: 5px;
  border: solid 1px lightblue;
  color: #2a5867;
  padding: 3px 0;
  margin-top: 16px;
`
AddProcess.displayName = 'RequestItemAddProcess'
