import {
  Fragment,
  ref,
  h,
  reactive,
  Teleport,
  defineComponent,
  provide,
  VNodeChild,
  InjectionKey,
  ExtractPropTypes,
  renderSlot,
  Ref
} from 'vue'
import { createId } from 'seemly'
import { ExtractPublicPropTypes, omit } from '../../_utils'
import { useConfig, useTheme } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import MessageEnvironment from './MessageEnvironment'
import { MessageTheme } from '../styles'

export interface MessageOptions {
  duration?: number
  closable?: boolean
  icon?: () => VNodeChild
  onClose?: () => void
}

export interface MessageApiInjection {
  info: (content: string, options: MessageOptions) => MessageReactive
  success: (content: string, options: MessageOptions) => MessageReactive
  warning: (content: string, options: MessageOptions) => MessageReactive
  error: (content: string, options: MessageOptions) => MessageReactive
  loading: (content: string, options: MessageOptions) => MessageReactive
}

export const messageApiInjectionKey: InjectionKey<MessageApiInjection> = Symbol(
  'messageApi'
)

export interface MessageReactive {
  content?: string
  duration?: number
  closable?: boolean
  icon?: () => VNodeChild
  onClose?: () => void
  destroy: () => void
}

interface PrivateMessageReactive extends MessageReactive {
  key: string
}

interface PrivateMessageRef extends MessageReactive {
  key: string
  hide: () => void
}

export type MessageProviderInst = MessageApiInjection

const messageProps = {
  ...(useTheme.props as ThemeProps<MessageTheme>),
  to: {
    type: [String, Object],
    default: undefined
  }
}

export type MessageProviderProps = ExtractPublicPropTypes<typeof messageProps>

type MessageProviderSetupProps = ExtractPropTypes<typeof messageProps>

export const messageProviderInjectionKey: InjectionKey<{
  props: MessageProviderSetupProps
  cPrefixRef: Ref<string>
}> = Symbol('messageProvider')

export default defineComponent({
  name: 'MessageProvider',
  props: messageProps,
  setup (props) {
    const { mergedClsPrefix } = useConfig(props)
    const messageListRef = ref<PrivateMessageReactive[]>([])
    const messageRefs = ref<{ [key: string]: PrivateMessageRef }>({})
    const api: MessageApiInjection = {
      info (content: string, options: MessageOptions) {
        return create(content, { ...options, type: 'info' })
      },
      success (content: string, options: MessageOptions) {
        return create(content, { ...options, type: 'success' })
      },
      warning (content: string, options: MessageOptions) {
        return create(content, { ...options, type: 'warning' })
      },
      error (content: string, options: MessageOptions) {
        return create(content, { ...options, type: 'error' })
      },
      loading (content: string, options: MessageOptions) {
        return create(content, { ...options, type: 'loading' })
      }
    }
    provide(messageProviderInjectionKey, { props, cPrefixRef: mergedClsPrefix })
    provide(messageApiInjectionKey, api)
    function create (content: string, options = {}): MessageReactive {
      const key = createId()
      const messageReactive = reactive({
        ...options,
        content,
        key,
        destroy: () => {
          messageRefs.value[key].hide()
        }
      })
      messageListRef.value.push(messageReactive)
      return messageReactive
    }
    function handleAfterLeave (key: string): void {
      messageListRef.value.splice(
        messageListRef.value.findIndex((message) => message.key === key),
        1
      )
    }
    return {
      cPrefix: mergedClsPrefix,
      messageRefs,
      messageList: messageListRef,
      handleAfterLeave,
      ...api
    }
  },
  render () {
    return (
      <>
        {renderSlot(this.$slots, 'default')}
        {this.messageList.length ? (
          <Teleport to={this.to ?? 'body'}>
            <div
              class={`${this.cPrefix}-message-container`}
              key="message-container"
            >
              {this.messageList.map((message) => {
                return (
                  <MessageEnvironment
                    ref={
                      ((inst: PrivateMessageRef) => {
                        this.messageRefs[message.key] = inst
                      }) as () => void
                    }
                    internalKey={message.key}
                    onInternalAfterLeave={this.handleAfterLeave}
                    {...omit(message, ['destroy'], undefined)}
                  />
                )
              })}
            </div>
          </Teleport>
        ) : null}
      </>
    )
  }
})