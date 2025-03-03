import { h, defineComponent, ref, toRef, watch, computed, PropType } from 'vue'
import { rgba } from 'seemly'
import { useMemo, useMergedState } from 'vooks'
import { RemoveIcon, AddIcon } from '../../_internal/icons'
import { NInput } from '../../input'
import type { InputInst } from '../../input'
import { NBaseIcon } from '../../_internal'
import { NButton } from '../../button'
import { useTheme, useFormItem, useLocale, useConfig } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { warn, call, MaybeArray, ExtractPublicPropTypes } from '../../_utils'
import { inputNumberLight, InputNumberTheme } from '../styles'
import { parse, validator, format, parseNumber } from './utils'
import type { OnUpdateValue } from './interface'

const inputNumberProps = {
  ...(useTheme.props as ThemeProps<InputNumberTheme>),
  placeholder: String,
  defaultValue: {
    type: Number as PropType<number | null>,
    default: null
  },
  value: Number,
  step: {
    type: [Number, String],
    default: 1
  },
  min: [Number, String],
  max: [Number, String],
  size: String as PropType<'small' | 'medium' | 'large'>,
  disabled: Boolean,
  validator: Function as PropType<(value: number) => boolean>,
  bordered: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined
  },
  showButton: {
    type: Boolean,
    default: true
  },
  'onUpdate:value': [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onUpdateValue: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onFocus: [Function, Array] as PropType<MaybeArray<(e: FocusEvent) => void>>,
  onBlur: [Function, Array] as PropType<MaybeArray<(e: FocusEvent) => void>>,
  // deprecated
  onChange: {
    type: [Function, Array] as PropType<MaybeArray<OnUpdateValue> | undefined>,
    validator: () => {
      if (__DEV__) {
        warn(
          'input-number',
          '`on-change` is deprecated, please use `on-update:value` instead.'
        )
      }
      return true
    },
    default: undefined
  }
}

export type InputNumberProps = ExtractPublicPropTypes<typeof inputNumberProps>

export default defineComponent({
  name: 'InputNumber',
  props: inputNumberProps,
  setup (props) {
    const { mergedBorderedRef, mergedClsPrefixRef } = useConfig(props)
    const themeRef = useTheme(
      'InputNumber',
      'InputNumber',
      undefined,
      inputNumberLight,
      props,
      mergedClsPrefixRef
    )
    const { localeRef } = useLocale('InputNumber')
    const formItem = useFormItem(props)
    // dom ref
    const inputInstRef = ref<InputInst | null>(null)
    const minusButtonInstRef = ref<{ $el: HTMLElement } | null>(null)
    const addButtonInstRef = ref<{ $el: HTMLElement } | null>(null)
    // value
    const uncontrolledValueRef = ref(props.defaultValue)
    const controlledValueRef = toRef(props, 'value')
    const mergedValueRef = useMergedState(
      controlledValueRef,
      uncontrolledValueRef
    )
    const displayedValueRef = ref('')
    const mergedPlaceholderRef = useMemo(() => {
      const { placeholder } = props
      if (placeholder !== undefined) return placeholder
      return localeRef.value.placeholder
    })
    const mergedStepRef = useMemo(() => {
      const parsedNumber = parseNumber(props.step)
      if (parsedNumber !== null) {
        return parsedNumber === 0 ? 1 : Math.abs(parsedNumber)
      }
      return 1
    })
    const mergedMinRef = useMemo(() => {
      const parsedNumber = parseNumber(props.min)
      if (parsedNumber !== null) return parsedNumber
      else return null
    })
    const mergedMaxRef = useMemo(() => {
      const parsedNumber = parseNumber(props.max)
      if (parsedNumber !== null) return parsedNumber
      else return null
    })
    const doUpdateValue = (value: number | null): void => {
      const { value: mergedValue } = mergedValueRef
      if (value === mergedValue) return
      const {
        'onUpdate:value': _onUpdateValue,
        onUpdateValue,
        onChange
      } = props
      const { nTriggerFormInput, nTriggerFormChange } = formItem
      if (onChange) call(onChange, value)
      if (onUpdateValue) call(onUpdateValue, value)
      if (_onUpdateValue) call(_onUpdateValue, value)
      uncontrolledValueRef.value = value
      nTriggerFormInput()
      nTriggerFormChange()
    }
    const deriveValueFromDisplayedValue = (
      offset = 0,
      doUpdateIfValid = true
    ): null | number | false => {
      const { value: displayedValue } = displayedValueRef
      const parsedValue = parse(displayedValue)
      if (parsedValue === null) {
        if (doUpdateIfValid) doUpdateValue(null)
        return null
      }
      if (validator(parsedValue)) {
        let nextValue = parsedValue + offset
        if (validator(nextValue)) {
          const { value: mergedMax } = mergedMaxRef
          const { value: mergedMin } = mergedMinRef
          if (mergedMax !== null && nextValue > mergedMax) {
            if (!doUpdateIfValid) return false
            nextValue = mergedMax
          }
          if (mergedMin !== null && nextValue < mergedMin) {
            if (!doUpdateIfValid) return false
            nextValue = mergedMin
          }
          if (props.validator && !props.validator(nextValue)) return false
          if (doUpdateIfValid) doUpdateValue(nextValue)
          return nextValue
        }
      }
      return false
    }
    const deriveDisplayedValueFromValue = (): void => {
      const { value: mergedValue } = mergedValueRef
      if (validator(mergedValue)) {
        displayedValueRef.value = format(mergedValue)
      } else {
        // null can pass the validator check
        // so mergedValue is a number
        displayedValueRef.value = String(mergedValue as number)
      }
    }
    deriveDisplayedValueFromValue()
    const displayedValueInvalidRef = useMemo(() => {
      const derivedValue = deriveValueFromDisplayedValue(0, false)
      return derivedValue === false
    })
    const minusableRef = useMemo(() => {
      const { value: mergedValue } = mergedValueRef
      if (props.validator && mergedValue === null) {
        return false
      }
      const { value: mergedStep } = mergedStepRef
      const derivedNextValue = deriveValueFromDisplayedValue(-mergedStep, false)
      return derivedNextValue !== false
    })
    const addableRef = useMemo(() => {
      const { value: mergedValue } = mergedValueRef
      if (props.validator && mergedValue === null) {
        return false
      }
      const { value: mergedStep } = mergedStepRef
      const derivedNextValue = deriveValueFromDisplayedValue(+mergedStep, false)
      return derivedNextValue !== false
    })
    function doFocus (e: FocusEvent): void {
      const { onFocus } = props
      const { nTriggerFormFocus } = formItem
      if (onFocus) call(onFocus, e)
      nTriggerFormFocus()
    }
    function doBlur (e: FocusEvent): void {
      if (e.target === inputInstRef.value?.wrapperElRef) {
        // hit input wrapper
        // which means not activated
        return
      }
      const value = deriveValueFromDisplayedValue()
      // If valid, update event has been emitted
      // make sure e.target.value is correct in blur callback
      if (value !== false) {
        const inputElRef = inputInstRef.value?.inputElRef
        if (inputElRef) {
          inputElRef.value = String(value || '')
        }
        // If value is not changed, the displayed value may be greater than or
        // less than the current value. The derived value is reformatted so the
        // value is not changed. We can simply derive a new displayed value
        if (mergedValueRef.value === value) {
          deriveDisplayedValueFromValue()
        }
      } else {
        // If not valid, nothing will be emitted, so derive displayed value from
        // origin value
        deriveDisplayedValueFromValue()
      }
      const { onBlur } = props
      const { nTriggerFormBlur } = formItem
      if (onBlur) call(onBlur, e)
      nTriggerFormBlur()
    }
    function doAdd (): void {
      const { value: addable } = addableRef
      if (!addable) return
      const { value: mergedValue } = mergedValueRef
      if (mergedValue === null) {
        if (!props.validator) {
          doUpdateValue(createValidValue() as number)
        }
      } else {
        const { value: mergedStep } = mergedStepRef
        deriveValueFromDisplayedValue(mergedStep)
      }
    }
    function doMinus (): void {
      const { value: minusable } = minusableRef
      if (!minusable) return
      const { value: mergedValue } = mergedValueRef
      if (mergedValue === null) {
        if (!props.validator) {
          doUpdateValue(createValidValue() as number)
        }
      } else {
        const { value: mergedStep } = mergedStepRef
        deriveValueFromDisplayedValue(-mergedStep)
      }
    }
    const handleFocus = doFocus
    const handleBlur = doBlur
    function createValidValue (): number | null {
      if (props.validator) return null
      const { value: mergedMin } = mergedMinRef
      const { value: mergedMax } = mergedMaxRef
      if (mergedMin !== null) {
        return Math.max(0, mergedMin)
      } else if (mergedMax !== null) {
        return Math.min(0, mergedMax)
      } else {
        return 0
      }
    }
    function handleMouseDown (e: MouseEvent): void {
      if (addButtonInstRef.value?.$el.contains(e.target as Node)) {
        e.preventDefault()
      }
      if (minusButtonInstRef.value?.$el.contains(e.target as Node)) {
        e.preventDefault()
      }
      inputInstRef.value?.activate()
    }
    const handleAddClick = doAdd
    const handleMinusClick = doMinus
    function handleKeyDown (e: KeyboardEvent): void {
      if (e.code === 'Enter') {
        if (e.target === inputInstRef.value?.wrapperElRef) {
          // hit input wrapper
          // which means not activated
          return
        }
        const value = deriveValueFromDisplayedValue()
        if (value !== false) {
          inputInstRef.value?.deactivate()
        }
      } else if (e.code === 'ArrowUp') {
        const value = deriveValueFromDisplayedValue()
        if (value !== false) {
          doAdd()
        }
      } else if (e.code === 'ArrowDown') {
        const value = deriveValueFromDisplayedValue()
        if (value !== false) {
          doMinus()
        }
      }
    }
    function handleUpdateDisplayedValue (value: string): void {
      displayedValueRef.value = value
      deriveValueFromDisplayedValue()
    }
    watch(mergedValueRef, () => {
      deriveDisplayedValueFromValue()
    })
    return {
      inputInstRef,
      minusButtonInstRef,
      addButtonInstRef,
      mergedClsPrefix: mergedClsPrefixRef,
      mergedBordered: mergedBorderedRef,
      uncontrolledValue: uncontrolledValueRef,
      mergedValue: mergedValueRef,
      mergedPlaceholder: mergedPlaceholderRef,
      displayedValueInvalid: displayedValueInvalidRef,
      mergedSize: formItem.mergedSizeRef,
      displayedValue: displayedValueRef,
      addable: addableRef,
      minusable: minusableRef,
      handleFocus,
      handleBlur,
      handleMouseDown,
      handleAddClick,
      handleMinusClick,
      handleKeyDown,
      handleUpdateDisplayedValue,
      // theme
      mergedTheme: themeRef,
      inputThemeOverrides: {
        paddingSmall: '0 8px 0 10px',
        paddingMedium: '0 8px 0 12px',
        paddingLarge: '0 8px 0 14px'
      },
      buttonThemeOverrides: computed(() => {
        const {
          self: { iconColorDisabled }
        } = themeRef.value
        const [r, g, b, a] = rgba(iconColorDisabled)
        return {
          textColorTextDisabled: `rgb(${r}, ${g}, ${b})`,
          opacityDisabled: `${a}`
        }
      })
    }
  },
  render () {
    const { mergedClsPrefix } = this
    return (
      <div class={`${mergedClsPrefix}-input-number`}>
        <NInput
          ref="inputInstRef"
          bordered={this.mergedBordered}
          value={this.displayedValue}
          onUpdateValue={this.handleUpdateDisplayedValue}
          theme={this.mergedTheme.peers.Input}
          themeOverrides={this.mergedTheme.peerOverrides.Input}
          builtinThemeOverrides={this.inputThemeOverrides}
          size={this.mergedSize}
          placeholder={this.mergedPlaceholder}
          disabled={this.disabled}
          textDecoration={
            this.displayedValueInvalid ? 'line-through' : undefined
          }
          onFocus={this.handleFocus}
          onBlur={this.handleBlur}
          onKeydown={this.handleKeyDown}
          onMousedown={this.handleMouseDown}
        >
          {this.showButton
            ? {
                suffix: () => [
                  <NButton
                    text
                    disabled={!this.minusable || this.disabled}
                    focusable={false}
                    builtinThemeOverrides={this.buttonThemeOverrides}
                    onClick={this.handleMinusClick}
                    ref="minusButtonInstRef"
                  >
                    {{
                      default: () => (
                        <NBaseIcon clsPrefix={mergedClsPrefix}>
                          {{
                            default: () => <RemoveIcon />
                          }}
                        </NBaseIcon>
                      )
                    }}
                  </NButton>,
                  <NButton
                    text
                    disabled={!this.addable || this.disabled}
                    focusable={false}
                    builtinThemeOverrides={this.buttonThemeOverrides}
                    onClick={this.handleAddClick}
                    ref="addButtonInstRef"
                  >
                    {{
                      default: () => (
                        <NBaseIcon clsPrefix={mergedClsPrefix}>
                          {{
                            default: () => <AddIcon />
                          }}
                        </NBaseIcon>
                      )
                    }}
                  </NButton>
                ]
              }
            : null}
        </NInput>
      </div>
    )
  }
})
