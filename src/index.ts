import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Schema, { Rules } from 'async-validator'

export interface CreateOptions<T> {
  // 表单创建初始化时值
  initialValues?: T
  onValuesChange?: (
    changedValues: Partial<T>,
    allValues: T,
  ) => void
  validateMessages?: FormCreateOptionMessages
}

/*
 *
 */
export interface Validator<V> {
  /** validation error message */
  message?: React.ReactNode;
  /** built-in validation type, available options: https://github.com/yiminghe/async-validator#type */
  type?: string;
  /** indicates whether field is required */
  required?: boolean;
  /** treat required fields that only contain whitespace as errors */
  whitespace?: boolean;
  /** validate the exact length of a field */
  len?: number;
  /** validate the min length of a field */
  min?: number;
  /** validate the max length of a field */
  max?: number;
  /** validate the value from a list of possible values */
  enum?: string | string[];
  /** validate from a regular expression */
  pattern?: RegExp;
  /** transform a value before validation */
  transform?: (value: V) => V;
  /** custom validate function (Note: callback must be called) */
  validator?: (
    rule: Validator<V>,
    value: any,
    callback: any,
    source?: any,
    options?: any
  ) => any;
}
declare type FormCreateOptionMessagesCallback = (...args: any[]) => string

interface FormCreateOptionMessages {
  [messageId: string]: string | FormCreateOptionMessagesCallback | FormCreateOptionMessages;
}

function validate<F>(
  messages: FormCreateOptionMessages | undefined,
  {
    ...fieldsOptions
  }: {
    [N in keyof F]: GetFieldDecoratorOptions<F[keyof F]>;
  },
  {
    ...values
  }: Partial<F>,
  ns?: (keyof F)[],
) {
  return new Promise((resolve, reject) => {
    ns = ns || (Object.keys(fieldsOptions) as (keyof F)[])
    const fieldsRule: {
      [N in keyof F]?: Validator<F[keyof F]>[]
    } = {}
    for (const name in fieldsOptions) {
      if (ns.includes(name)) {
        fieldsRule[name] = fieldsOptions[name].rules || [{ required: false }]
      }
    }

    for (const name in values) {
      if (!ns.includes(name)) {
        delete values[name]
      }
    }

    const validator = new Schema(fieldsRule as Rules)
    if (messages) {
      (validator as any).messages(messages)
    }
    validator.validate(
      values,
      {},
      (errors) => {
        if (errors) {
          const errorsObj: {
            [N in keyof F]?: [{ message: string; field: keyof F }];
          } = {}
          for (const { field, message } of errors || []) {
            errorsObj[field] = [{ message, field }]
          }
          reject({ errors: errorsObj, values })
        } else {
          resolve(values)
        }
      },
    )
  })
}

export type FieldsErrors<T> = {
  [N in keyof T]?: {
    message: string
    field: keyof T
  }[]
}

export interface GetFieldDecoratorOptions<T> {
  rules?: Validator<T>[]
  trigger?: string
  valuePropName?: string
}

function objFilter<T>(obj: { [N in keyof T]?: any }, ns?: (keyof T)[]) {
  if (ns) {
    (Object.keys(obj) as (keyof T)[]).forEach(name => {
      if (!ns.includes(name)) {
        delete obj[name]
      }
    })
  }
  return obj
}


export function useForm<T = any>(createOptions: CreateOptions<T> = {}) {
  const cacheData = useRef<{
    fieldsTouched: {
      /**
       * `undefined` means `false` here
       */
      [N in keyof T]?: boolean
    };
    fieldsValidated: {
      [N in keyof T]?: boolean
    };
    currentField?: keyof T
  }>({
    fieldsTouched: {},
    fieldsValidated: {},
  })
  const [errors, setErrors] = useState<FieldsErrors<T>>({})
  const [values, setValues] = useState<T>(createOptions.initialValues || {} as T)
  const valuesRef = useRef(values)
  const errorsRef = useRef(errors)
  const fieldsOptionsRef = useRef<{
    [N in keyof T]: GetFieldDecoratorOptions<T[keyof T]>
  }>({} as any)

  useEffect(() => {
    valuesRef.current = {
      ...valuesRef.current,
      ...values,
    }
  }, [values])

  useEffect(() => {
    errorsRef.current = errors
  }, [errors])

  useEffect(() => {
    const {
      current: { fieldsTouched: fieldsChanged, currentField },
    } = cacheData
    if (currentField === undefined || !fieldsChanged[currentField]) {
      return
    }

    validate(createOptions.validateMessages, fieldsOptionsRef.current, values, [currentField])
      .then(() => {
        setErrors(errors => {
          const errs = { ...errors }
          delete errs[currentField]
          return errs
        })
      })
      .catch(({ errors: newErrors }: any) => {
        setErrors(oldErrors => ({
          ...oldErrors,
          ...newErrors,
        }))
      })
  }, [values, fieldsOptionsRef, cacheData])

  const getFieldProps = useCallback((
    name: keyof T,
    options: GetFieldDecoratorOptions<T[keyof T]> = {  rules: [{ required: false }], },
  ) => {
    const {
      trigger = 'onChange',
      valuePropName = 'value',
    } = options
    const props: any = {
      [trigger]: (e: string | any) => {
        const value = e && e.target ? e.target.value : e
        const currentValue: { [N in keyof T]?: T[N] } = {}
        currentValue[name] = value
        const newValues = {
          ...valuesRef.current,
          ...currentValue,
        }
        const { current } = cacheData
        current.currentField = name
        current.fieldsTouched[name] = true
        setValues(newValues)
        if (createOptions.onValuesChange) {
          createOptions.onValuesChange(
            {
              [name]: value,
            } as typeof values,
            newValues,
          )
        }
      },
      'data-__field': { errors: errorsRef.current[name] },
      'data-__meta': {
        validate: [
          {
            rules: options.rules,
          },
        ],
      },
    }

    props[valuePropName] = valuesRef.current[name]

    return props
  }, [valuesRef, errorsRef, cacheData, createOptions.onValuesChange, fieldsOptionsRef])

  const getFieldDecorator = useCallback(
    (
      name,
      options: GetFieldDecoratorOptions<T[keyof T]> = {
        rules: [{ required: false }],
      },
    ) => {
      const setOptions = (name: keyof T) => {
        fieldsOptionsRef.current[name] = options
      }
      if (name instanceof Array) {
        name.forEach(n => setOptions(n))
      } else {
        setOptions(name)
      }
      const props: any = getFieldProps(name, options)
      return (fieldElem: React.ReactElement) => {
        const { trigger = 'onChange' } = options
        return React.cloneElement(fieldElem, {
          ...fieldElem.props,
          ...props,
          [trigger]: (e: any) => {
            props[trigger](e)
            if ((fieldElem.props as any)[trigger]) {
              (fieldElem.props as any)[trigger](e)
            }
          },
        } as any)
      }
    },
    [valuesRef, errorsRef, cacheData, createOptions.onValuesChange, fieldsOptionsRef],
  )


  const setFieldsValue = useCallback(
    ({ ...newValues }) =>
      setValues(oldValues => {
        const values = { ...oldValues, ...newValues }
        return values
      }),
    [],
  )

  const setFieldsValueAndDispatchChanges = useCallback(
    ({ ...changeValues }) => {
      const newValues = {
        ...valuesRef.current,
        ...changeValues,
      }
      const { current } = cacheData
      current.currentField = name
      setValues(newValues)
      if (createOptions.onValuesChange) {
        createOptions.onValuesChange(
          changeValues,
          newValues,
        )
      }
    },
    [valuesRef, cacheData],
  )

  const getFieldsValue = useCallback(
    (ns) => {
      const result = { ...valuesRef.current }
      objFilter(result, ns)
      return result
    },
    [valuesRef],
  )

  const resetFields = useCallback((ns?: (keyof T)[], defaultValues?: Partial<T>) => {
    const { current } = cacheData
    delete current.currentField
    if (!ns) {
      setValues(defaultValues ? defaultValues as T : {} as T)
      setErrors({})
      Object.keys(current).forEach(name => (current[name] = {}))
    } else {
      const newValues = { ...valuesRef.current }
      const newErrors = { ...errorsRef.current }

      for (const name of ns) {
        current.fieldsTouched[name] = false
        newValues[name as any] = defaultValues && defaultValues[name] ? defaultValues[name] : undefined
        newErrors[name] = undefined
      }
      setValues(newValues)
      setErrors(newErrors)
    }
  }, [valuesRef, errorsRef, cacheData])


  const validateFields = useCallback(
    (ns?: (keyof T)[], options = {}): Promise<T> =>
      new Promise(async (resolve, reject) => {
        const { fieldsValidated } = cacheData.current
        if (ns) {
          ns.forEach(name => {
            fieldsValidated[name] = true
          })
        }
        if (options.force) {
          const newErrors = { ...errorsRef.current }
          Object.keys(fieldsValidated).forEach(name => {
            if (fieldsValidated[name]) {
              newErrors[name] = undefined
            }
          })
          setErrors(newErrors)
        }
        validate(createOptions.validateMessages, fieldsOptionsRef.current, valuesRef.current, ns)
          .then((values: any) => resolve(values as T))
          .catch((a: any) => {
            const { errors: newErrors } = a
            setErrors(errors => ({
              ...errors,
              ...newErrors,
            }))
            reject(newErrors[Object.keys(newErrors)[0]][0])
          })
      }),
    [errorsRef, valuesRef, createOptions.validateMessages, cacheData],
  )

  const getFieldValue = useCallback(name => valuesRef.current[name], [valuesRef])

  const setFields = useCallback(fields => {
    setValues(oldValues => {
      const values = { ...oldValues }
      for (const name in fields) {
        const { value } = fields[name]
        values[name] = value
      }
      return values
    })
    setErrors(oldErrors => {
      const errors = { ...oldErrors }
      for (const name in fields) {
        const errorArr = fields[name].errors || []
        errors[name] = errorArr.map(({ message }: any) => ({
          message,
          field: name,
        }))
      }
      return errors
    })
  }, [])

  const isFieldTouched = useCallback(
    name => !!cacheData.current.fieldsTouched[name],
    [cacheData],
  )

  const isFieldsTouched = useCallback(
    (names: (keyof T)[] = []) =>
      names.some(x => !!cacheData.current.fieldsTouched[x]),
    [cacheData],
  )

  return {
    errors,
    values,
    getFieldDecorator,
    getFieldProps,
    setFieldsValue,
    setFieldsValueAndDispatchChanges,
    getFieldsValue,
    getFieldValue,
    setFields,
    resetFields,
    validateFields,
    isFieldTouched,
    isFieldsTouched,
  }
}
