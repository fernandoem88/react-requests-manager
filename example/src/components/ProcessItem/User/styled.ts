import styled from 'styled-components'
export const Root = styled.div.attrs({
  'data-tbsc-name': 'User--Root'
})<{}>`
  display: flex;
  height: 24px;
  & > :first-child {
    width: calc(100% - 80px);
    text-align: center;
    padding-top: 3px;
  }

  & > :last-child {
    margin-left: 3px;
    text-align: center;
    padding-top: 2px;
    color: red;
    border: solid 1px red;
    border-radius: 5px;
    width: 77px;
  }
`
Root.displayName = 'UserRoot'
