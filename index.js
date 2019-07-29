import Card from './packages/common/Card'
import Icon from './packages/common/Icon'
import Loader from './packages/common/Loader'
import GradientText from './packages/common/GradientText'
import ColumnGroup from './packages/common/ColumnGroup'
import WithPadding from './packages/common/WithPadding'
import WithMargin from './packages/common/WithMargin'
import MasonryGroup from './packages/common/MasonryGroup'
import Table from './packages/common/Table'
import AdvanceTable from './packages/common/AdvanceTable'
import CheckBox from './packages/common/Checkbox'
import RoundButton from './packages/common/Button'
import Switch from './packages/common/Switch'
import Select from './packages/common/Select'
import Modal from './packages/common/Modal'
import Input from './packages/common/Input'
import Message from './packages/common/Message'
import Notification from './packages/common/Notification'
import Pagination from './packages/common/Pagination'
import Tooltip from './packages/common/Tooltip'
import Popup from './packages/common/Popover'
import Alert from './packages/common/Alert'
import DatePicker from './packages/common/DatePicker'
import InputNumber from './packages/common/InputNumber'
import Radio from './packages/common/Radio'
import Form from './packages/common/Form'
import TimePicker from './packages/common/TimePicker'
import ServiceCard from './packages/nimbus/ServiceCard'
import HomeLayout from './packages/nimbus/HomeLayout'
import Navbar from './packages/nimbus/Navbar'
import ServiceLayout from './packages/nimbus/ServiceLayout'
import NimbusFormCard from './packages/nimbus/FormCard'
import NimbusConfirmCard from './packages/nimbus/ConfirmCard'
import NimbusIcon from './packages/nimbus/Icon'
import Scrollbar from './packages/common/Scrollbar'

function install (Vue) {
  Card.install(Vue)
  Icon.install(Vue)
  ServiceLayout.install(Vue)
  Navbar.install(Vue)
  Loader.install(Vue)
  HomeLayout.install(Vue)
  GradientText.install(Vue)
  ColumnGroup.install(Vue)
  WithPadding.install(Vue)
  ServiceCard.install(Vue)
  MasonryGroup.install(Vue)
  Table.install(Vue)
  AdvanceTable.install(Vue)
  WithMargin.install(Vue)
  CheckBox.install(Vue)
  RoundButton.install(Vue)
  Switch.install(Vue)
  Select.install(Vue)
  Modal.install(Vue)
  NimbusFormCard.install(Vue)
  Input.install(Vue)
  Message.install(Vue)
  Notification.install(Vue)
  NimbusConfirmCard.install(Vue)
  Pagination.install(Vue)
  Tooltip.install(Vue)
  Popup.install(Vue)
  Alert.install(Vue)
  DatePicker.install(Vue)
  InputNumber.install(Vue)
  NimbusIcon.install(Vue)
  Radio.install(Vue)
  Form.install(Vue)
  TimePicker.install(Vue)
  Scrollbar.install(Vue)
}

export default {
  install
}
