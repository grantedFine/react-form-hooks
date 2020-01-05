# react-form-hook

## Hooks for rc-form like component. Support for two-way data flow.

```js
import  { useForm } from 'react-form-hook'
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

