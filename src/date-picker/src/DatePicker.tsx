import {
  h,
  defineComponent,
  ref,
  Transition,
  computed,
  provide,
  PropType,
  watch,
  withDirectives,
  ExtractPropTypes,
  CSSProperties,
  toRef,
  Ref,
  watchEffect
} from 'vue'
import { VBinder, VTarget, VFollower, FollowerPlacement } from 'vueuc'
import { clickoutside } from 'vdirs'
import { format, getTime, isValid } from 'date-fns'
import { useIsMounted, useMergedState } from 'vooks'
import { happensIn } from 'seemly'
import { InputInst, InputProps, NInput } from '../../input'
import { NBaseIcon } from '../../_internal'
import { useFormItem, useTheme, useConfig, useLocale } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { DateIcon, ToIcon } from '../../_internal/icons'
import { warn, call, useAdjustedTo, createKey } from '../../_utils'
import type { MaybeArray, ExtractPublicPropTypes } from '../../_utils'
import { datePickerLight } from '../styles'
import { strictParse } from './utils'
// import { getDerivedTimeFromKeyboardEvent } from './utils'
import {
  uniCalendarValidation,
  dualCalendarValidation
} from './validation-utils'
import DatetimePanel from './panel/datetime'
import DatetimerangePanel from './panel/datetimerange'
import DatePanel from './panel/date'
import DaterangePanel from './panel/daterange'
import style from './styles/index.cssr'
import { DatePickerTheme } from '../styles/light'
import {
  OnUpdateValue,
  OnUpdateValueImpl,
  Value,
  PanelRef,
  IsDateDisabled,
  IsTimeDisabled,
  datePickerInjectionKey
} from './interface'
import { Size as TimePickerSize } from '../../time-picker/src/interface'

const DATE_FORMAT = {
  date: 'yyyy-MM-dd',
  datetime: 'yyyy-MM-dd HH:mm:ss',
  daterange: 'yyyy-MM-dd',
  datetimerange: 'yyyy-MM-dd HH:mm:ss'
}

const datePickerProps = {
  ...(useTheme.props as ThemeProps<DatePickerTheme>),
  to: useAdjustedTo.propTo,
  bordered: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined
  },
  clearable: {
    type: Boolean,
    default: false
  },
  updateValueOnClose: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: [Number, Array] as PropType<Value | null>,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placement: {
    type: String as PropType<FollowerPlacement>,
    default: 'bottom-start'
  },
  value: [Number, Array] as PropType<Value | null>,
  size: String as PropType<'small' | 'medium' | 'large'>,
  type: {
    type: String as PropType<
    'date' | 'datetime' | 'daterange' | 'datetimerange'
    >,
    default: 'date'
  },
  separator: String,
  placeholder: String,
  startPlaceholder: String,
  endPlaceholder: String,
  format: String,
  dateFormat: String,
  timeFormat: String,
  actions: Array as PropType<Array<'clear' | 'cancel' | 'confirm'>>,
  isDateDisabled: Function as PropType<IsDateDisabled>,
  isTimeDisabled: Function as PropType<IsTimeDisabled>,
  show: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined
  },
  ranges: Object as PropType<Record<string, [number, number]>>,
  'onUpdate:show': [Function, Array] as PropType<
  MaybeArray<(show: boolean) => void>
  >,
  onUpdateShow: [Function, Array] as PropType<
  MaybeArray<(show: boolean) => void>
  >,
  'onUpdate:value': [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onUpdateValue: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onFocus: [Function, Array] as PropType<(e: FocusEvent) => void>,
  onBlur: [Function, Array] as PropType<(e: FocusEvent) => void>,
  // deprecated
  onChange: {
    type: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
    validator: () => {
      if (__DEV__) {
        warn(
          'data-picker',
          '`on-change` is deprecated, please use `on-update:value` instead.'
        )
      }
      return true
    },
    default: undefined
  }
} as const

export type DatePickerSetupProps = ExtractPropTypes<typeof datePickerProps>
export type DatePickerProps = ExtractPublicPropTypes<typeof datePickerProps>

export default defineComponent({
  name: 'DatePicker',
  props: datePickerProps,
  setup (props, { slots }) {
    const { localeRef, dateLocaleRef } = useLocale('DatePicker')
    const formItem = useFormItem(props)
    const {
      NConfigProvider,
      mergedClsPrefixRef,
      mergedBorderedRef,
      namespaceRef
    } = useConfig(props)
    const panelInstRef = ref<PanelRef | null>(null)
    const triggerElRef = ref<HTMLElement | null>(null)
    const inputInstRef = ref<InputInst | null>(null)
    const uncontrolledShowRef = ref<boolean>(false)
    const controlledShowRef = toRef(props, 'show')
    const mergedShowRef = useMergedState(controlledShowRef, uncontrolledShowRef)
    const uncontrolledValueRef = ref(props.defaultValue)
    const controlledValueRef = computed(() => props.value)
    const mergedValueRef = useMergedState(
      controlledValueRef,
      uncontrolledValueRef
    )
    // We don't change value unless blur or confirm is called
    const pendingValueRef: Ref<Value | null> = ref(null)
    watchEffect(() => {
      pendingValueRef.value = mergedValueRef.value
    })
    const singleInputValueRef = ref('')
    const rangeStartInputValueRef = ref('')
    const rangeEndInputValueRef = ref('')
    const themeRef = useTheme(
      'DatePicker',
      'DatePicker',
      style,
      datePickerLight,
      props,
      mergedClsPrefixRef
    )
    const dateFnsOptionsRef = computed(() => {
      return {
        locale: dateLocaleRef.value.locale
      }
    })
    const timePickerSizeRef = computed<TimePickerSize>(() => {
      return (
        NConfigProvider?.mergedComponentPropsRef.value?.DatePicker
          ?.timePickerSize || 'small'
      )
    })
    const isRangeRef = computed(() => {
      return ['daterange', 'datetimerange'].includes(props.type)
    })
    const localizedPlacehoderRef = computed(() => {
      if (props.placeholder === undefined) {
        if (props.type === 'date') {
          return localeRef.value.datePlaceholder
        } else if (props.type === 'datetime') {
          return localeRef.value.datetimePlaceholder
        }
        return props.placeholder
      } else {
        return props.placeholder
      }
    })
    const localizedStartPlaceholderRef = computed(() => {
      if (props.startPlaceholder === undefined) {
        if (props.type === 'daterange') {
          return localeRef.value.startDatePlaceholder
        } else if (props.type === 'datetimerange') {
          return localeRef.value.startDatetimePlaceholder
        }
        return ''
      } else {
        return props.startPlaceholder
      }
    })
    const localizedEndPlaceholderRef = computed(() => {
      if (props.endPlaceholder === undefined) {
        if (props.type === 'daterange') {
          return localeRef.value.endDatePlaceholder
        } else if (props.type === 'datetimerange') {
          return localeRef.value.endDatetimePlaceholder
        }
        return ''
      } else {
        return props.endPlaceholder
      }
    })
    const mergedFormatRef = computed(() => {
      return props.format || DATE_FORMAT[props.type]
    })
    function doUpdatePendingValue (value: Value | null): void {
      pendingValueRef.value = value
    }
    function doUpdateValue (value: Value | null): void {
      const {
        'onUpdate:value': _onUpdateValue,
        onUpdateValue,
        onChange
      } = props
      const { nTriggerFormChange, nTriggerFormInput } = formItem
      if (onUpdateValue) call(onUpdateValue as OnUpdateValueImpl, value)
      if (_onUpdateValue) call(_onUpdateValue as OnUpdateValueImpl, value)
      if (onChange) call(onChange as OnUpdateValueImpl, value)
      uncontrolledValueRef.value = value
      nTriggerFormChange()
      nTriggerFormInput()
    }
    function doFocus (e: FocusEvent): void {
      const { onFocus } = props
      const { nTriggerFormFocus } = formItem
      if (onFocus) call(onFocus, e)
      nTriggerFormFocus()
    }
    function doBlur (e: FocusEvent): void {
      const { onBlur } = props
      const { nTriggerFormBlur } = formItem
      if (onBlur) call(onBlur, e)
      nTriggerFormBlur()
    }
    function doUpdateShow (show: boolean): void {
      const { 'onUpdate:show': _onUpdateShow, onUpdateShow } = props
      if (_onUpdateShow) call(_onUpdateShow, show)
      if (onUpdateShow) call(onUpdateShow, show)
      uncontrolledShowRef.value = show
    }
    function handleKeyDown (e: KeyboardEvent): void {
      if (e.code === 'Escape') {
        closeCalendar({
          returnFocus: true
        })
      }
      // We need to handle the conflict with normal date value input
      // const { value: mergedValue } = mergedValueRef
      // if (props.type === 'date' && !Array.isArray(mergedValue)) {
      //   const nextValue = getDerivedTimeFromKeyboardEvent(mergedValue, e)
      //   doUpdateValue(nextValue)
      // }
    }
    function handleClear (): void {
      doUpdateShow(false)
      inputInstRef.value?.deactivate()
    }
    function handlePanelTabOut (): void {
      closeCalendar({
        returnFocus: true
      })
    }
    function handleClickOutside (e: MouseEvent): void {
      if (
        mergedShowRef.value &&
        !triggerElRef.value?.contains(e.target as Node)
      ) {
        closeCalendar({
          returnFocus: false
        })
      }
    }
    function handlePanelClose (disableUpdateOnClose: boolean): void {
      closeCalendar({
        returnFocus: true,
        disableUpdateOnClose
      })
    }
    // --- Panel update value
    function handlePanelUpdateValue (
      value: Value | null,
      doUpdate: boolean
    ): void {
      if (doUpdate) {
        doUpdateValue(value)
      } else {
        doUpdatePendingValue(value)
      }
    }
    function handlePanelConfirm (): void {
      doUpdateValue(pendingValueRef.value)
    }
    // --- Refresh
    function deriveInputState (): void {
      const { value } = pendingValueRef
      if (isRangeRef.value) {
        if (Array.isArray(value) || value === null) {
          deriveRangeInputState(value)
        }
      } else {
        if (!Array.isArray(value)) {
          deriveSingleInputState(value)
        }
      }
    }
    function deriveSingleInputState (value: number | null): void {
      if (value === null) {
        singleInputValueRef.value = ''
      } else {
        singleInputValueRef.value = format(
          value,
          mergedFormatRef.value,
          dateFnsOptionsRef.value
        )
      }
    }
    function deriveRangeInputState (values: [number, number] | null): void {
      if (values === null) {
        rangeStartInputValueRef.value = ''
        rangeEndInputValueRef.value = ''
      } else {
        const dateFnsOptions = dateFnsOptionsRef.value
        rangeStartInputValueRef.value = format(
          values[0],
          mergedFormatRef.value,
          dateFnsOptions
        )
        rangeEndInputValueRef.value = format(
          values[1],
          mergedFormatRef.value,
          dateFnsOptions
        )
      }
    }
    // --- Input deactivate & blur
    function handleInputActivate (): void {
      if (!mergedShowRef.value) {
        openCalendar()
      }
    }
    function handleInputBlur (e: FocusEvent): void {
      if (!panelInstRef.value?.$el.contains(e.relatedTarget as Node)) {
        doBlur(e)
        deriveInputState()
        closeCalendar({
          returnFocus: false
        })
      }
    }
    function handleInputDeactivate (): void {
      if (props.disabled) return
      deriveInputState()
      closeCalendar({
        returnFocus: false
      })
    }
    // --- Input
    function handleSingleUpdateValue (v: string): void {
      // TODO, fix conflict with clear
      if (v === '') {
        doUpdateValue(null)
        return
      }
      const newSelectedDateTime = strictParse(
        v,
        mergedFormatRef.value,
        new Date(),
        dateFnsOptionsRef.value
      )
      if (isValid(newSelectedDateTime)) {
        doUpdateValue(getTime(newSelectedDateTime))
        deriveInputState()
      } else {
        singleInputValueRef.value = v
      }
    }
    function handleRangeUpdateValue (v: [string, string]): void {
      if (v[0] === '' && v[1] === '') {
        // clear or just delete all the inputs
        doUpdateValue(null)
        return
      }
      const [startTime, endTime] = v
      const newStartTime = strictParse(
        startTime,
        mergedFormatRef.value,
        new Date(),
        dateFnsOptionsRef.value
      )
      const newEndTime = strictParse(
        endTime,
        mergedFormatRef.value,
        new Date(),
        dateFnsOptionsRef.value
      )
      if (isValid(newStartTime) && isValid(newEndTime)) {
        doUpdateValue([getTime(newStartTime), getTime(newEndTime)])
        deriveInputState()
      } else {
        ;[rangeStartInputValueRef.value, rangeEndInputValueRef.value] = v
      }
    }
    // --- Click
    function handleTriggerClick (e: MouseEvent): void {
      if (props.disabled) return
      if (happensIn(e, 'clear')) return
      if (!mergedShowRef.value) {
        openCalendar()
      }
    }
    // --- Focus
    function handleInputFocus (e: FocusEvent): void {
      if (props.disabled) return
      doFocus(e)
    }
    // --- Calendar
    function openCalendar (): void {
      if (props.disabled || mergedShowRef.value) return
      doUpdateShow(true)
    }
    function closeCalendar ({
      returnFocus,
      disableUpdateOnClose
    }: {
      returnFocus: boolean
      disableUpdateOnClose?: boolean
    }): void {
      if (mergedShowRef.value) {
        doUpdateShow(false)
        if (
          props.type !== 'date' &&
          props.updateValueOnClose &&
          !disableUpdateOnClose
        ) {
          handlePanelConfirm()
        }
        if (returnFocus) {
          inputInstRef.value?.focus()
        }
      }
    }
    // If new value is valid, set calendarTime and refresh display strings.
    // If new value is invalid, do nothing.
    watch(pendingValueRef, () => {
      deriveInputState()
    })
    // init
    deriveInputState()

    watch(mergedShowRef, (value) => {
      if (!value) {
        // close & restore original value
        // it won't conflict with props.value change
        // since when prop is passed, it is already
        // up to date.
        pendingValueRef.value = mergedValueRef.value
      }
    })

    // use pending value to do validation
    const uniVaidation = uniCalendarValidation(props, pendingValueRef)
    const dualValidation = dualCalendarValidation(props, pendingValueRef)
    provide(datePickerInjectionKey, {
      mergedClsPrefixRef,
      mergedThemeRef: themeRef,
      timePickerSizeRef,
      localeRef,
      dateLocaleRef,
      isDateDisabledRef: toRef(props, 'isDateDisabled'),
      rangesRef: toRef(props, 'ranges'),
      ...uniVaidation,
      ...dualValidation,
      datePickerSlots: slots
    })
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      mergedBordered: mergedBorderedRef,
      namespace: namespaceRef,
      uncontrolledValue: uncontrolledValueRef,
      pendingValue: pendingValueRef,
      panelInstRef,
      triggerElRef,
      inputInstRef,
      isMounted: useIsMounted(),
      displayTime: singleInputValueRef,
      displayStartTime: rangeStartInputValueRef,
      displayEndTime: rangeEndInputValueRef,
      mergedShow: mergedShowRef,
      adjustedTo: useAdjustedTo(props),
      isRange: isRangeRef,
      localizedStartPlaceholder: localizedStartPlaceholderRef,
      localizedEndPlaceholder: localizedEndPlaceholderRef,
      mergedSize: formItem.mergedSizeRef,
      localizedPlacehoder: localizedPlacehoderRef,
      isValueInvalid: uniVaidation.isValueInvalidRef,
      isStartValueInvalid: dualValidation.isStartValueInvalidRef,
      isEndValueInvalid: dualValidation.isEndValueInvalidRef,
      handleClickOutside,
      handleKeyDown,
      handleClear,
      handleTriggerClick,
      handleInputActivate,
      handleInputDeactivate,
      handleInputFocus,
      handleInputBlur,
      handlePanelTabOut,
      handlePanelClose,
      handleRangeUpdateValue,
      handleSingleUpdateValue,
      handlePanelUpdateValue,
      handlePanelConfirm,
      mergedTheme: themeRef,
      triggerCssVars: computed(() => {
        const {
          common: { cubicBezierEaseInOut },
          self: { iconColor, iconColorDisabled }
        } = themeRef.value
        return {
          '--bezier': cubicBezierEaseInOut,
          '--icon-color': iconColor,
          '--icon-color-disabled': iconColorDisabled
        }
      }),
      cssVars: computed(() => {
        const { type } = props
        const {
          common: { cubicBezierEaseInOut },
          self: {
            calendarTitleFontSize,
            calendarDaysFontSize,
            itemFontSize,
            itemTextColor,
            itemColorDisabled,
            itemColorIncluded,
            itemColorHover,
            itemColorActive,
            itemBorderRadius,
            itemTextColorDisabled,
            itemTextColorActive,
            panelColor,
            panelTextColor,
            arrowColor,
            calendarTitleTextColor,
            panelActionDividerColor,
            panelHeaderDividerColor,
            calendarDaysDividerColor,
            panelBoxShadow,
            panelBorderRadius,
            calendarTitleFontWeight,
            panelExtraFooterPadding,
            panelActionPadding,
            itemSize,
            itemCellWidth,
            itemCellHeight,
            calendarTitlePadding,
            calendarTitleHeight,
            calendarDaysHeight,
            calendarDaysTextColor,
            arrowSize,
            panelHeaderPadding,
            calendarDividerColor,
            calendarTitleGridTempateColumns,
            iconColor,
            iconColorDisabled,
            [createKey('calendarLeftPadding', type)]: calendarLeftPadding,
            [createKey('calendarRightPadding', type)]: calendarRightPadding
          }
        } = themeRef.value
        return {
          '--bezier': cubicBezierEaseInOut,

          '--panel-border-radius': panelBorderRadius,
          '--panel-color': panelColor,
          '--panel-box-shadow': panelBoxShadow,
          '--panel-text-color': panelTextColor,

          // panel header
          '--panel-header-padding': panelHeaderPadding,
          '--panel-header-divider-color': panelHeaderDividerColor,

          // panel calendar
          '--calendar-left-padding': calendarLeftPadding,
          '--calendar-right-padding': calendarRightPadding,
          '--calendar-title-height': calendarTitleHeight,
          '--calendar-title-padding': calendarTitlePadding,
          '--calendar-title-font-size': calendarTitleFontSize,
          '--calendar-title-font-weight': calendarTitleFontWeight,
          '--calendar-title-text-color': calendarTitleTextColor,
          '--calendar-title-grid-template-columns':
            calendarTitleGridTempateColumns,
          '--calendar-days-height': calendarDaysHeight,
          '--calendar-days-divider-color': calendarDaysDividerColor,
          '--calendar-days-font-size': calendarDaysFontSize,
          '--calendar-days-text-color': calendarDaysTextColor,
          '--calendar-divider-color': calendarDividerColor,

          // panel action
          '--panel-action-padding': panelActionPadding,
          '--panel-extra-footer-padding': panelExtraFooterPadding,
          '--panel-action-divider-color': panelActionDividerColor,

          // panel item
          '--item-font-size': itemFontSize,
          '--item-border-radius': itemBorderRadius,
          '--item-size': itemSize,
          '--item-cell-width': itemCellWidth,
          '--item-cell-height': itemCellHeight,
          '--item-text-color': itemTextColor,
          '--item-color-included': itemColorIncluded,
          '--item-color-disabled': itemColorDisabled,
          '--item-color-hover': itemColorHover,
          '--item-color-active': itemColorActive,
          '--item-text-color-disabled': itemTextColorDisabled,
          '--item-text-color-active': itemTextColorActive,

          // panel arrow
          '--arrow-size': arrowSize,
          '--arrow-color': arrowColor,

          // icon in trigger
          '--icon-color': iconColor,
          '--icon-color-disabled': iconColorDisabled
        }
      })
    }
  },
  render () {
    const { clearable } = this
    const commonInputProps: InputProps = {
      bordered: this.mergedBordered,
      size: this.mergedSize,
      passivelyActivated: true,
      disabled: this.disabled,
      readonly: this.disabled,
      clearable,
      onClear: this.handleClear,
      onClick: this.handleTriggerClick,
      onActivate: this.handleInputActivate,
      onDeactivate: this.handleInputDeactivate,
      onFocus: this.handleInputFocus,
      onBlur: this.handleInputBlur
    }
    const commonPanelProps = {
      onUpdateValue: this.handlePanelUpdateValue,
      onTabOut: this.handlePanelTabOut,
      onClose: this.handlePanelClose,
      onKeydown: this.handleKeyDown,
      onConfirm: this.handlePanelConfirm,
      ref: 'panelInstRef',
      value: this.pendingValue,
      active: this.mergedShow,
      actions: this.actions,
      style: this.cssVars as CSSProperties
    }
    const { mergedClsPrefix } = this
    return (
      <div
        ref="triggerElRef"
        class={[
          `${mergedClsPrefix}-date-picker`,
          this.disabled && `${mergedClsPrefix}-date-picker--disabled`,
          this.isRange && `${mergedClsPrefix}-date-picker--range`
        ]}
        style={this.triggerCssVars as CSSProperties}
        onKeydown={this.handleKeyDown}
      >
        <VBinder>
          {{
            default: () => [
              <VTarget>
                {{
                  default: () =>
                    this.isRange ? (
                      <NInput
                        ref="inputInstRef"
                        value={[this.displayStartTime, this.displayEndTime]}
                        placeholder={[
                          this.localizedStartPlaceholder,
                          this.localizedEndPlaceholder
                        ]}
                        textDecoration={[
                          this.isStartValueInvalid ? 'line-through' : '',
                          this.isEndValueInvalid ? 'line-through' : ''
                        ]}
                        pair
                        onUpdateValue={this.handleRangeUpdateValue}
                        theme={this.mergedTheme.peers.Input}
                        themeOverrides={this.mergedTheme.peerOverrides.Input}
                        internalForceFocus={this.mergedShow}
                        internalDeactivateOnEnter
                        {...commonInputProps}
                      >
                        {{
                          separator: () => (
                            <NBaseIcon
                              clsPrefix={mergedClsPrefix}
                              class={`${mergedClsPrefix}-date-picker-icon`}
                            >
                              {{ default: () => <ToIcon /> }}
                            </NBaseIcon>
                          ),
                          [clearable ? 'clear' : 'suffix']: () => (
                            <NBaseIcon
                              clsPrefix={mergedClsPrefix}
                              class={`${mergedClsPrefix}-date-picker-icon`}
                            >
                              {{ default: () => <DateIcon /> }}
                            </NBaseIcon>
                          )
                        }}
                      </NInput>
                    ) : (
                      <NInput
                        ref="inputInstRef"
                        value={this.displayTime}
                        placeholder={this.localizedPlacehoder}
                        textDecoration={
                          this.isValueInvalid && !this.isRange
                            ? 'line-through'
                            : ''
                        }
                        onUpdateValue={this.handleSingleUpdateValue}
                        theme={this.mergedTheme.peers.Input}
                        themeOverrides={this.mergedTheme.peerOverrides.Input}
                        internalForceFocus={this.mergedShow}
                        internalDeactivateOnEnter
                        {...commonInputProps}
                      >
                        {{
                          [clearable ? 'clear' : 'suffix']: () => (
                            <NBaseIcon
                              clsPrefix={mergedClsPrefix}
                              class={`${mergedClsPrefix}-date-picker-icon`}
                            >
                              {{ default: () => <DateIcon /> }}
                            </NBaseIcon>
                          )
                        }}
                      </NInput>
                    )
                }}
              </VTarget>,
              <VFollower
                show={this.mergedShow}
                containerClass={this.namespace}
                to={this.adjustedTo}
                teleportDisabled={this.adjustedTo === useAdjustedTo.tdkey}
                placement="bottom-start"
              >
                {{
                  default: () => (
                    <Transition
                      name="fade-in-scale-up-transition"
                      appear={this.isMounted}
                    >
                      {{
                        default: () =>
                          this.mergedShow
                            ? withDirectives(
                              this.type === 'datetime' ? (
                                  <DatetimePanel {...commonPanelProps} />
                              ) : this.type === 'daterange' ? (
                                  <DaterangePanel {...commonPanelProps} />
                              ) : this.type === 'datetimerange' ? (
                                  <DatetimerangePanel {...commonPanelProps} />
                              ) : (
                                  <DatePanel {...commonPanelProps} />
                              ),
                              [[clickoutside, this.handleClickOutside]]
                            )
                            : null
                      }}
                    </Transition>
                  )
                }}
              </VFollower>
            ]
          }}
        </VBinder>
      </div>
    )
  }
})
