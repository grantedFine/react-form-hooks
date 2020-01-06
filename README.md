# react-form-hook
### Hooks for rc-form like component. Support two-way data flow.

## begin to use
```js
  npm install react-hooks-for-form
```
## Example
```js
import  { useForm } from 'react-hooks-for-form'
c
const {
  getFieldDecorator,
  setFieldsValue,
  setFieldsValueAndDispatchChanges
} = useForm({
  initialValues: {}
  onValuesChange: (changeValues, allValues) => {}
})
<form>
  {getFieldDecorator('name', otherOptions)(<input />)}
</form>
```
| ReturnValue    | Description                              | Type       | Default |
|-----------|------------------------------------------|------------|---------|
| getFieldDecorator | create props which can be set on a input/InputComponent which support value and onChange interface | Func | (name:String, option: Object) => (React.Node) => React.Node |
| setFieldsValue | Set fields value by kv object. | (value): Object | (value) => ({ value }) |
| setFieldsValueAndDispatchChanges | Set fields value by kv object, then dispatch onValuesChange immediately. | (value): Object | (value) => ({ value }) |

