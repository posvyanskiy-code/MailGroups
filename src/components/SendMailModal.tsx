import { Modal, Form, Input, Alert, message } from 'antd'
import { mailGroupService } from '../services'

interface Props {
  open: boolean
  groupId: string
  onClose: () => void
  onSent?: () => void
}

export function SendMailModal({ open, groupId, onClose, onSent }: Props) {
  const [form] = Form.useForm<{ subject: string; body: string }>()

  return (
    <Modal
      title="Send broadcast"
      open={open}
      onCancel={onClose}
      onOk={async () => {
        try {
          const v = await form.validateFields()
          await mailGroupService.sendMail(groupId, v.subject, v.body)
          message.success('Sent')
          form.resetFields()
          onSent?.()
          onClose()
        } catch (e: unknown) {
          if (e && typeof e === 'object' && 'errorFields' in e) return // form validation error already shown
          const err = e as { message?: string }
          message.error(`Failed to send: ${err?.message ?? String(e)}`)
        }
      }}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16 }}
        message="Demo mode"
        description="The dev tenant has no Exchange mailbox, so emails are recorded in the journal but not actually delivered."
      />
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="body" label="Body (HTML)" rules={[{ required: true }]}>
          <Input.TextArea rows={8} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
