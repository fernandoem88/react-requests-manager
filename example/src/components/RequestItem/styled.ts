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
  & > * {
    flex-grow: 1;
  }
`
export const Title = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Title'
})<{}>`
  padding-right: 6px;
`
export const Status = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--Status'
})<{}>`
  text-align: center;
`
Status.displayName = 'RequestItemStatus'
export const ActionWrapper = styled.div.attrs({
  'data-tbsc-name': 'RequestItem--ActionWrapper'
})<{}>`
  text-align: right;
`
ActionWrapper.displayName = 'RequestItemActionWrapper'
Title.displayName = 'RequestItemTitle'
Header.displayName = 'RequestItemHeader'
